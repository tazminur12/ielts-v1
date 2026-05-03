import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import type { IQuestionGroup } from "@/models/QuestionGroup";
import Question from "@/models/Question";
import type { IQuestion } from "@/models/Question";
import OpenAI from "openai";
import type { Types } from "mongoose";
import { z } from "zod";
import {
  buildListeningTranscriptFromPayload,
  synthesizeListeningAudioToS3,
} from "@/lib/listeningTts";
import {
  AUTHENTIC_IELTS_SYSTEM,
  GENERATION_MODEL,
  sanitizeIeltsCandidateText,
} from "@/lib/ieltsGeneration";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SectionSchemaType =
  | "listening_part"
  | "reading_passage"
  | "writing_task"
  | "speaking_part";

interface AISectionPayload {
  sectionTitle?: string;
  sectionType?: string;
  partNumber?: number;
  instruction?: string;
  instructions?: string;
  passage?: string;
  groups?: unknown[];
}

function mockPreamble(
  examType: string,
  ieltsType: string
): string {
  if (examType !== "mock") return "";
  return `Admin context only (do NOT print this in passages or questions): target a full-length timed exam in ${ieltsType} IELTS style — band-appropriate difficulty, authentic section structure. Student-facing text must read like a real paper, not a drill or synopsis.`;
}

function mapToSectionType(
  raw: string | undefined,
  moduleHint: string
): SectionSchemaType {
  const r = (raw || "").toLowerCase();
  if (r.includes("listen")) return "listening_part";
  if (r.includes("read")) return "reading_passage";
  if (r.includes("writ")) return "writing_task";
  if (r.includes("speak")) return "speaking_part";
  const h = moduleHint.toLowerCase();
  if (h === "listening") return "listening_part";
  if (h === "reading") return "reading_passage";
  if (h === "writing") return "writing_task";
  if (h === "speaking") return "speaking_part";
  return "reading_passage";
}

function normalizeQuestionType(t: string | undefined): string {
  const x = (t || "short_answer").toLowerCase();
  if (x === "yes_no_not_given") return "true_false_not_given";
  return x;
}

function formatOptions(qData: { options?: unknown[] }) {
  return (qData.options || []).map((opt: unknown, index: number) => {
    if (typeof opt === "object" && opt !== null && "label" in opt && "text" in opt) {
      const o = opt as { label: string; text: string };
      return { label: o.label, text: o.text };
    }
    const textStr = String(opt);
    const match = textStr.match(/^([A-Z])[\).]?\s*(.*)$/i);
    if (match) {
      return { label: match[1].toUpperCase(), text: match[2].trim() || textStr };
    }
    return { label: String.fromCharCode(65 + index), text: textStr };
  });
}

async function persistGroupsForSection(
  testId: Types.ObjectId,
  sectionId: Types.ObjectId,
  groups: Array<{
    title?: string;
    instruction?: string;
    passage?: string;
    questions?: Array<{
      type?: string;
      text?: string;
      options?: unknown[];
      correctAnswer?: string;
      marks?: number;
      speakingPrompt?: string;
      speakingDuration?: number;
    }>;
  }>,
  startQuestionNumber: number,
  skill?: IQuestion["skill"]
): Promise<number> {
  let totalQuestions = 0;
  let qCursor = startQuestionNumber;

  for (let i = 0; i < groups.length; i++) {
    const groupData = groups[i];
    const qs = groupData.questions;
    if (!qs || !Array.isArray(qs) || qs.length === 0) continue;

    const newGroup = await QuestionGroup.create({
      sectionId,
      testId,
      title:
        groupData.title != null && groupData.title !== ""
          ? sanitizeIeltsCandidateText(String(groupData.title))
          : groupData.title,
      instructions: sanitizeIeltsCandidateText(
        [groupData.instruction || "", groupData.passage || ""].filter(Boolean).join("\n\n")
      ),
      order: i + 1,
      questionType: normalizeQuestionType(qs[0]?.type) as IQuestionGroup["questionType"],
      questionNumberStart: qCursor,
      questionNumberEnd: qCursor + qs.length - 1,
    });

    for (let j = 0; j < qs.length; j++) {
      const qData = qs[j];
      const formattedOptions = formatOptions(qData).map((o) => ({
        ...o,
        text: sanitizeIeltsCandidateText(o.text),
      }));
      await Question.create({
        testId,
        sectionId,
        groupId: newGroup._id,
        questionText: sanitizeIeltsCandidateText(qData.text || ""),
        questionType: normalizeQuestionType(qData.type) as IQuestion["questionType"],
        questionNumber: qCursor,
        options: formattedOptions,
        correctAnswer: qData.correctAnswer || "",
        speakingPrompt:
          normalizeQuestionType(qData.type) === "speaking" && qData.speakingPrompt
            ? sanitizeIeltsCandidateText(String(qData.speakingPrompt))
            : undefined,
        speakingDuration:
          normalizeQuestionType(qData.type) === "speaking" && typeof qData.speakingDuration === "number"
            ? qData.speakingDuration
            : undefined,
        marks: qData.marks || 1,
        order: j + 1,
        ...(skill ? { skill } : {}),
      });
      qCursor += 1;
      totalQuestions += 1;
    }
  }

  return totalQuestions;
}

function durationForMockModule(
  module: string
): number {
  switch (module) {
    case "listening":
      return 30;
    case "reading":
      return 60;
    case "writing":
      return 60;
    case "speaking":
      return 15;
    case "full":
      return 165;
    default:
      return 40;
  }
}

function buildWritingPrompt(
  topic: string,
  difficulty: string,
  examType: string,
  ieltsType: string
) {
  const m = mockPreamble(examType, ieltsType);
  return `Produce a complete ${ieltsType} IELTS Writing paper section (Tasks 1 and 2) as it would appear to candidates.
${m}
Topic/theme focus: ${topic || "General"}
Difficulty band target: ${difficulty || "medium"}

Fill every text field with publication-quality task prompts and stimulus descriptions. Task 1 must include believable data description (chart/table/process/diagram) in prose where the JSON field "passage" holds the visual description for Task 1.

Return ONLY valid JSON (no markdown fences) in exactly this shape:

{
  "sectionTitle": "Writing Tasks",
  "groups": [
    {
      "title": "Task 1",
      "instruction": "You should spend about 20 minutes on this task.",
      "passage": "A description of the chart/graph/diagram problem.",
      "questions": [
        {
          "type": "essay",
          "text": "Write a report for a university lecturer describing the information shown below.",
          "marks": 1
        }
      ]
    },
    {
      "title": "Task 2",
      "instruction": "You should spend about 40 minutes on this task.",
      "passage": "",
      "questions": [
        {
          "type": "essay",
          "text": "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words about the topic.",
          "marks": 1
        }
      ]
    }
  ]
}
`;
}

function buildSpeakingPrompt(
  topic: string,
  examType: string,
  ieltsType: string
) {
  const m = mockPreamble(examType, ieltsType);
  return `Produce a complete ${ieltsType} IELTS Speaking test (Parts 1–3) as authentic examiner prompts and cue-card wording.
${m}
Thematic focus: ${topic || "General"}

Questions must sound like a live exam: natural follow-ups, specific Part 1 topics, a detailed Part 2 cue card, abstract Part 3 questions. No robotic repetition.

Return ONLY valid JSON in exactly this shape:

{
  "sectionTitle": "Speaking Test",
  "groups": [
    {
      "title": "Part 1: Introduction and Interview",
      "instruction": "Answer the following questions about yourself.",
      "questions": [
        { "type": "speaking", "text": "Question 1?", "speakingDuration": 30, "marks": 1 },
        { "type": "speaking", "text": "Question 2?", "speakingDuration": 30, "marks": 1 }
      ]
    },
    {
      "title": "Part 2: Long Turn (Cue Card)",
      "instruction": "Describe a time when you... You should say: where it was, when it was, who you were with, and explain why you remember it so well.",
      "questions": [
        { "type": "speaking", "text": "Talk about the topic on your cue card.", "speakingPrompt": "Describe ... You should say: ...", "speakingDuration": 120, "marks": 1 }
      ]
    },
    {
      "title": "Part 3: Discussion",
      "instruction": "Let's discuss this topic further.",
      "questions": [
        { "type": "speaking", "text": "Question 1?", "speakingDuration": 60, "marks": 1 },
        { "type": "speaking", "text": "Question 2?", "speakingDuration": 60, "marks": 1 }
      ]
    }
  ]
}`;
}

function buildReadingListeningPrompt(
  module: string,
  topic: string,
  difficulty: string,
  questionCount: number,
  questionTypes: string[],
  examType: string,
  ieltsType: string
) {
  const typesList =
    Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes.join(", ")
      : "mixed (multiple choice, true/false, fill in the blanks)";
  const m = mockPreamble(examType, ieltsType);
  return `Produce one complete ${ieltsType} IELTS ${module} section as printed for candidates (passage/transcript + questions).
${m}
Subject focus: ${topic || "General"}
Difficulty: ${difficulty || "medium"}

Requirements:
- Exactly ${questionCount} questions in total.
- Question types to use: ${typesList}.
- Split into "groups" where rubrics differ; each group may have its own "passage" snippet if needed, or one shared passage in the first group.
- For listening: write a full transcript in natural dialogue or monologue style (realistic speakers, not stilted).
- For reading: write a cohesive academic passage (or passages) with the tone of articles, notices, or journals as appropriate — not a summary essay about the topic.

Return ONLY valid JSON (no markdown) in exactly this shape:

{
  "sectionTitle": "${module} Passage 1",
  "groups": [
    {
      "title": "Questions 1-3",
      "instruction": "Choose the correct letter A, B, C, or D.",
      "passage": "Essay or transcript text.",
      "questions": [
        {
          "type": "multiple_choice",
          "text": "What is the main idea of the first paragraph?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "marks": 1
        }
      ]
    }
  ]
}`;
}

function buildOfficialListeningModulePrompt(topic: string, difficulty: string, ieltsType: string, titleBase?: string) {
  const m = mockPreamble("practice", ieltsType);
  const base = (titleBase || "").trim() || "Listening Section";
  return `Produce a complete ${ieltsType} IELTS Listening module that strictly follows the official international structure.
${m}
Topic/theme focus: ${topic || "General"}
Difficulty: ${difficulty || "medium"}

STRICT REQUIREMENTS (must follow exactly):
- 4 listening sections (partNumber 1..4)
- 10 questions per section (total 40)
- Each section must include a full transcript in "passage"
- Use "${base}" as the base sectionTitle and append the partNumber (e.g. "${base} 1", "${base} 2").
- Use authentic IELTS rubrics ("Write ONE WORD AND/OR A NUMBER.", "Choose the correct letter A, B, C or D.", etc.)
- Objective questions must include correctAnswer
- multiple_choice must have exactly 4 options and correctAnswer must be A/B/C/D

Return ONLY valid JSON (no markdown) in exactly this shape:
{
  "schemaVersion": "ielts_module_v1",
  "sections": [
    {
      "sectionTitle": "${base} 1",
      "sectionType": "listening_part",
      "partNumber": 1,
      "instruction": "You will hear a conversation between two people. Answer the questions.",
      "passage": "Full transcript for Section 1.",
      "groups": [
        {
          "title": "Questions 1-10",
          "instruction": "Choose the correct letter A, B, C or D.",
          "questions": [
            { "type": "multiple_choice", "text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A", "marks": 1 }
          ]
        }
      ]
    }
  ]
}`;
}

function buildOfficialReadingModulePrompt(topic: string, difficulty: string, ieltsType: string, titleBase?: string) {
  const m = mockPreamble("practice", ieltsType);
  const base = (titleBase || "").trim() || "Reading Passage";
  return `Produce a complete ${ieltsType} IELTS Reading module that strictly follows the official international structure.
${m}
Topic/theme focus: ${topic || "General"}
Difficulty: ${difficulty || "medium"}

STRICT REQUIREMENTS (must follow exactly):
- 3 passages (partNumber 1..3)
- Total questions = 40 with distribution: Passage 1 = 13, Passage 2 = 13, Passage 3 = 14
- Each passage must be 700–1000 words in "passage" (aim ~850). Before returning, count the words and ensure each passage is within range.
- Use "${base}" as the base sectionTitle and append the partNumber (e.g. "${base} 1", "${base} 2", "${base} 3").
- Use authentic IELTS rubrics and realistic topics (not a generic essay about the topic)
- Objective questions must include correctAnswer
- multiple_choice must have exactly 4 options and correctAnswer must be A/B/C/D

Return ONLY valid JSON (no markdown) in exactly this shape:
{
  "schemaVersion": "ielts_module_v1",
  "sections": [
    {
      "sectionTitle": "${base} 1",
      "sectionType": "reading_passage",
      "partNumber": 1,
      "instruction": "Read the passage and answer the questions.",
      "passage": "700–1000 word passage.",
      "groups": [
        {
          "title": "Questions 1-13",
          "instruction": "Do the following statements agree with the information in the passage?",
          "questions": [
            { "type": "true_false_not_given", "text": "...", "correctAnswer": "TRUE", "marks": 1 }
          ]
        }
      ]
    }
  ]
}`;
}

function buildOfficialWritingModulePrompt(topic: string, difficulty: string, ieltsType: string, titleBase?: string) {
  const m = mockPreamble("practice", ieltsType);
  const base = (titleBase || "").trim() || "Writing Task";
  return `Produce a complete ${ieltsType} IELTS Writing module that strictly follows the official international structure.
${m}
Topic/theme focus: ${topic || "General"}
Difficulty: ${difficulty || "medium"}

STRICT REQUIREMENTS (must follow exactly):
- Task 1 and Task 2 must be separate sections (partNumber 1 and 2), each containing exactly one essay question.
- Task 1 instruction must include "You should spend about 20 minutes on this task."
- Task 2 instruction must include "You should spend about 40 minutes on this task."
- Use "${base}" as the base sectionTitle and append the partNumber (e.g. "${base} 1", "${base} 2").
- Do not include answers, band scores, or AI mentions in student-facing text.

Return ONLY valid JSON (no markdown) in exactly this shape:
{
  "schemaVersion": "ielts_module_v1",
  "sections": [
    {
      "sectionTitle": "${base} 1",
      "sectionType": "writing_task",
      "partNumber": 1,
      "instruction": "You should spend about 20 minutes on this task.",
      "passage": "",
      "groups": [
        {
          "title": "Task 1",
          "instruction": "You should spend about 20 minutes on this task.",
          "passage": "Academic: describe the visual (chart/table/process/diagram) in words. General: include the situation and bullet points for the letter.",
          "questions": [ { "type": "essay", "text": "...", "marks": 1 } ]
        }
      ]
    },
    {
      "sectionTitle": "${base} 2",
      "sectionType": "writing_task",
      "partNumber": 2,
      "instruction": "You should spend about 40 minutes on this task.",
      "passage": "",
      "groups": [
        {
          "title": "Task 2",
          "instruction": "You should spend about 40 minutes on this task.",
          "passage": "",
          "questions": [ { "type": "essay", "text": "...", "marks": 1 } ]
        }
      ]
    }
  ]
}`;
}

function buildOfficialSpeakingModulePrompt(topic: string, ieltsType: string, titleBase?: string) {
  const m = mockPreamble("practice", ieltsType);
  const base = (titleBase || "").trim() || "Speaking Part";
  return `Produce a complete ${ieltsType} IELTS Speaking module that strictly follows the official international structure.
${m}
Topic/theme focus: ${topic || "General"}

STRICT REQUIREMENTS (must follow exactly):
- Parts 1, 2, 3 must be separate sections (partNumber 1..3)
- Use "${base}" as the base sectionTitle and append the partNumber (e.g. "${base} 1", "${base} 2", "${base} 3").
- All questions must use type "speaking"
- Part 2 must include exactly one cue card question with "speakingPrompt" and speakingDuration = 120
- Part 1 questions speakingDuration ~30; Part 3 ~60

Return ONLY valid JSON (no markdown) in exactly this shape:
{
  "schemaVersion": "ielts_module_v1",
  "sections": [
    {
      "sectionTitle": "${base} 1",
      "sectionType": "speaking_part",
      "partNumber": 1,
      "instruction": "Answer the following questions about yourself.",
      "passage": "",
      "groups": [
        {
          "title": "Part 1: Introduction and Interview",
          "instruction": "Answer the following questions about yourself.",
          "questions": [
            { "type": "speaking", "text": "Question 1?", "speakingDuration": 30, "marks": 1 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "${base} 2",
      "sectionType": "speaking_part",
      "partNumber": 2,
      "instruction": "You will have 1 minute to prepare and you should speak for 1 to 2 minutes.",
      "passage": "",
      "groups": [
        {
          "title": "Part 2: Long Turn (Cue Card)",
          "instruction": "Here is your cue card.",
          "questions": [
            { "type": "speaking", "text": "Talk about the topic on your cue card.", "speakingPrompt": "Describe ... You should say: ...", "speakingDuration": 120, "marks": 1 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "${base} 3",
      "sectionType": "speaking_part",
      "partNumber": 3,
      "instruction": "Let's discuss this topic further.",
      "passage": "",
      "groups": [
        {
          "title": "Part 3: Discussion",
          "instruction": "Let's discuss this topic further.",
          "questions": [
            { "type": "speaking", "text": "Question 1?", "speakingDuration": 60, "marks": 1 }
          ]
        }
      ]
    }
  ]
}`;
}

type FullMockSectionHints = {
  listeningTopic?: string;
  listeningTitle?: string;
  readingTopic?: string;
  readingTitle?: string;
  writingTopic?: string;
  writingTitle?: string;
  speakingTopic?: string;
  speakingTitle?: string;
};

function fullMockSectionLine(
  label: string,
  topicHint: string | undefined,
  titleHint: string | undefined,
  fallback: string
): string {
  const t = (topicHint || "").trim() || fallback;
  const ti = (titleHint || "").trim();
  const titlePart = ti
    ? ` Use "${ti}" as the base sectionTitle for ${label}. If there are multiple parts/passages/tasks, append the partNumber (e.g. "${ti} 1", "${ti} 2").`
    : "";
  return `${label}: all content in this section must follow the theme "${t}".${titlePart}`;
}

function buildFullMockPrompt(
  topic: string,
  difficulty: string,
  _questionCount: number,
  ieltsType: string,
  hints: FullMockSectionHints = {}
) {
  const m = mockPreamble("mock", ieltsType);
  const fb = topic || "Contemporary issues";

  const listeningL = fullMockSectionLine(
    "Listening",
    hints.listeningTopic,
    hints.listeningTitle,
    fb
  );
  const readingL = fullMockSectionLine(
    "Reading",
    hints.readingTopic,
    hints.readingTitle,
    fb
  );
  const writingL = fullMockSectionLine(
    "Writing",
    hints.writingTopic,
    hints.writingTitle,
    fb
  );
  const speakingL = fullMockSectionLine(
    "Speaking",
    hints.speakingTopic,
    hints.speakingTitle,
    fb
  );

  return `Produce a complete four-skills ${ieltsType} IELTS test in one JSON object: Listening, Reading, Writing, Speaking — as if assembled for a formal sitting.
${m}
Default fallback theme (use only where a section line below does not specify its own theme): ${fb}

Section-specific requirements (follow each strictly):
- ${listeningL}
- ${readingL}
- ${writingL}
- ${speakingL}

Difficulty: ${difficulty || "medium"}

STRICT IELTS PARITY REQUIREMENTS (must follow exactly):
- Listening must have EXACTLY 4 sections (partNumber 1..4). Each listening section must have EXACTLY 10 scored questions. Total listening questions = 40.
- Reading must have EXACTLY 3 passages (partNumber 1..3). Total reading questions = 40 with distribution: Passage 1 = 13, Passage 2 = 13, Passage 3 = 14.
- Reading passageText must be 700–1000 words each (count words; not characters).
- Writing must have EXACTLY 2 tasks: Task 1 and Task 2 (each in its own writing_task section with partNumber 1 and 2). Task 1 instruction must say "You should spend about 20 minutes...". Task 2 instruction must say "You should spend about 40 minutes...". Each task must include ONE essay question.
- Speaking must have Parts 1, 2, 3 (three speaking_part sections with partNumber 1, 2, 3). Use question type "speaking" (not short_answer/essay) so the platform records audio.
  - Part 1: 6–8 short examiner questions (speakingDuration ~30s).
  - Part 2: ONE cue-card speaking question. Put the cue card text in "speakingPrompt" field. Set speakingDuration = 120. Preparation time is handled by the platform; do not mention AI.
  - Part 3: 4–6 discussion questions (speakingDuration ~60s).

Question type rules:
- Allowed question types: multiple_choice, true_false_not_given, fill_blank, matching, matching_headings, summary_completion, short_answer, essay, speaking.
- For every objective question (all types except essay and speaking): include "correctAnswer". Use official IELTS-style rubrics like "Write ONE WORD AND/OR A NUMBER.".
- multiple_choice must have exactly 4 options and correctAnswer must be one of "A","B","C","D".
- For fill_blank/short_answer/sentence-like items: correctAnswer must be a single string (no explanations needed).

Every section's titles, instructions, passages, and questions must read as professional test content. Do not use headings like "Mock Test" or "Sample" in student-facing strings; use neutral labels unless a section title was given above.

Return ONLY valid JSON (no markdown) in this shape:
{
  "schemaVersion": "ielts_full_v1",
  "sections": [
    {
      "sectionTitle": "Listening Section 1",
      "sectionType": "listening_part",
      "partNumber": 1,
      "instruction": "You will hear a number of recordings. Answer the questions.",
      "passage": "Full transcript text that questions refer to (for Section 1 only).",
      "groups": [
        {
          "title": "Questions 1-10",
          "instruction": "Choose the correct letter A, B, C or D.",
          "questions": [
            { "type": "multiple_choice", "text": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A", "marks": 1 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "Reading Passage 1",
      "sectionType": "reading_passage",
      "partNumber": 1,
      "instruction": "Read the passage and answer the questions.",
      "passage": "A 700–1000 word passage.",
      "groups": [
        {
          "title": "Questions 1-13",
          "instruction": "Do the following statements agree with the information in the passage?",
          "questions": [
            { "type": "true_false_not_given", "text": "...", "correctAnswer": "TRUE", "marks": 1 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "Writing Task 1",
      "sectionType": "writing_task",
      "partNumber": 1,
      "instruction": "You should spend about 20 minutes on this task.",
      "passage": "",
      "groups": [
        {
          "title": "Task 1",
          "instruction": "You should spend about 20 minutes on this task.",
          "passage": "Academic: describe the visual (chart/table/process/diagram) in words. General: include the situation and bullet points for the letter.",
          "questions": [ { "type": "essay", "text": "...", "marks": 1 } ]
        }
      ]
    },
    {
      "sectionTitle": "Speaking Part 2",
      "sectionType": "speaking_part",
      "partNumber": 2,
      "instruction": "You will have 1 minute to prepare and you should speak for 1 to 2 minutes.",
      "passage": "",
      "groups": [
        {
          "title": "Part 2: Long Turn (Cue Card)",
          "instruction": "Here is your cue card.",
          "questions": [
            { "type": "speaking", "text": "Talk about the topic on your cue card.", "speakingPrompt": "Describe ... You should say: ...", "speakingDuration": 120, "marks": 1 }
          ]
        }
      ]
    }
  ]
}
Include ALL required sections (4 listening + 3 reading + 2 writing + 3 speaking) in the sections array. Ensure the exact question counts match the parity rules.`;
}

const AIGeneratedQuestionSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
    options: z.array(z.any()).optional(),
    correctAnswer: z.any().optional(),
    marks: z.number().optional(),
    speakingPrompt: z.string().optional(),
    speakingDuration: z.number().optional(),
  })
  .passthrough();

const AIGeneratedGroupSchema = z
  .object({
    title: z.string().optional(),
    instruction: z.string().optional(),
    passage: z.string().optional(),
    questions: z.array(AIGeneratedQuestionSchema).optional(),
  })
  .passthrough();

const AIGeneratedSectionSchema = z
  .object({
    sectionTitle: z.string().optional(),
    sectionType: z.string().optional(),
    partNumber: z.number().int().optional(),
    instruction: z.string().optional(),
    instructions: z.string().optional(),
    passage: z.string().optional(),
    groups: z.array(AIGeneratedGroupSchema).optional(),
  })
  .passthrough();

const AIGeneratedFullMockSchema = z
  .object({
    schemaVersion: z.string().optional(),
    sections: z.array(AIGeneratedSectionSchema),
  })
  .passthrough();

function countWords(input: string): number {
  return String(input || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function rewriteReadingPassagesToWordRange(args: {
  passages: Array<{ partNumber: number; passage: string }>;
  topic: string;
  difficulty: string;
  ieltsType: string;
  minWords: number;
  maxWords: number;
  targetWords: number;
}) {
  let current = new Map<number, string>(
    args.passages.map((p) => [p.partNumber, sanitizeIeltsCandidateText(String(p.passage || ""))])
  );

  const clampRounds = 3;
  for (let round = 0; round < clampRounds; round++) {
    const invalid = Array.from(current.entries())
      .map(([partNumber, passage]) => ({
        partNumber,
        passage,
        wordCount: countWords(passage),
      }))
      .filter((p) => p.wordCount < args.minWords || p.wordCount > args.maxWords);

    if (invalid.length === 0) return current;

    const completion = await openai.chat.completions.create({
      model: GENERATION_MODEL,
      messages: [
        { role: "system", content: AUTHENTIC_IELTS_SYSTEM },
        {
          role: "user",
          content: `Rewrite and adjust EACH IELTS Reading passage below so that it is ${args.minWords}–${args.maxWords} words (target ~${args.targetWords} words).

Constraints:
- Keep the same topic and meaning; do not contradict facts already stated.
- Natural IELTS reading style: academic magazine / report tone, coherent paragraphs, no bullet lists.
- Do not add questions or answers.
- Do not add headings like "Passage" or "Section"; just the passage text.
- If a passage is too short, append new paragraphs at the END until it reaches the target range.
- If a passage is too long, shorten by removing non-essential sentences while preserving meaning.
- Before returning, ensure the word count of EACH passage is within range.

Topic focus: ${args.topic}
Difficulty: ${args.difficulty}
IELTS type: ${args.ieltsType}

Return ONLY valid JSON (no markdown) in this shape:
{ "passages": [ { "partNumber": 1, "passage": "..." } ] }

Passages to adjust (with current wordCount):
${JSON.stringify(invalid)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 12000,
    });

    const txt = completion.choices[0].message.content;
    if (!txt) throw new Error("Empty response while repairing reading passage length.");
    const parsed = JSON.parse(txt) as Record<string, unknown>;
    const rawPassages = Array.isArray(parsed.passages) ? parsed.passages : [];
    for (const p of rawPassages) {
      if (!p || typeof p !== "object") continue;
      const pn = Number((p as { partNumber?: unknown }).partNumber || 0);
      const passage = sanitizeIeltsCandidateText(String((p as { passage?: unknown }).passage || ""));
      if (pn > 0 && passage.trim().length > 0) current.set(pn, passage);
    }
  }

  return current;
}

async function maybeAutoFixReadingPassages(args: {
  full: z.infer<typeof AIGeneratedFullMockSchema>;
  topic: string;
  difficulty: string;
  ieltsType: string;
}) {
  const type = (v: unknown) => String(v || "").toLowerCase();
  const readingSections = args.full.sections.filter((s) => type(s.sectionType).includes("reading"));
  if (readingSections.length === 0) return args.full;

  const needsFix = readingSections.some((s) => {
    const wc = countWords(String(s.passage || ""));
    return wc < 700 || wc > 1000;
  });
  if (!needsFix) return args.full;

  const toFix: Array<{ partNumber: number; passage: string }> = [];
  for (const s of readingSections) {
    const pn = Number(s.partNumber || 0) || 0;
    const original = String(s.passage || "");
    const wc = countWords(original);
    if (wc < 700 || wc > 1000) toFix.push({ partNumber: pn, passage: original });
  }
  const fixed = await rewriteReadingPassagesToWordRange({
    passages: toFix,
    topic: args.topic,
    difficulty: args.difficulty,
    ieltsType: args.ieltsType,
    minWords: 700,
    maxWords: 1000,
    targetWords: 850,
  });
  for (const s of readingSections) {
    const pn = Number(s.partNumber || 0) || 0;
    const newPassage = fixed.get(pn);
    if (newPassage) s.passage = newPassage;
  }

  return args.full;
}

function flattenQuestions(section: z.infer<typeof AIGeneratedSectionSchema>): Array<z.infer<typeof AIGeneratedQuestionSchema>> {
  const groups = Array.isArray(section.groups) ? section.groups : [];
  return groups.flatMap((g) => (Array.isArray(g.questions) ? g.questions : []));
}

function validateQuestionsBasics(sections: Array<z.infer<typeof AIGeneratedSectionSchema>>) {
  const allowedTypes = new Set([
    "multiple_choice",
    "true_false_not_given",
    "fill_blank",
    "matching",
    "matching_headings",
    "summary_completion",
    "sentence_completion",
    "short_answer",
    "essay",
    "speaking",
  ]);

  for (const s of sections) {
    for (const q of flattenQuestions(s)) {
      const t = String(q.type || "").trim();
      if (!allowedTypes.has(t)) throw new Error(`Unsupported question type: ${t}`);
      if (t !== "essay" && t !== "speaking") {
        if (q.correctAnswer == null || String(q.correctAnswer).trim().length === 0) {
          throw new Error("Every objective question must include correctAnswer.");
        }
        if (t === "multiple_choice") {
          const opts = Array.isArray(q.options) ? q.options : [];
          if (opts.length !== 4) throw new Error("multiple_choice must include exactly 4 options.");
          const ca = String(q.correctAnswer).trim().toUpperCase();
          if (!["A", "B", "C", "D"].includes(ca)) throw new Error("multiple_choice correctAnswer must be A/B/C/D.");
        }
      } else if (t === "speaking") {
        if (!q.text || String(q.text).trim().length === 0) throw new Error("Speaking questions must include text.");
      }
    }
  }
}

function validateFullMockParity(
  input: z.infer<typeof AIGeneratedFullMockSchema>,
  opts?: { enforceReadingWordCount?: boolean }
) {
  const sections = input.sections;
  const listening = sections.filter((s) => String(s.sectionType).toLowerCase().includes("listening"));
  const reading = sections.filter((s) => String(s.sectionType).toLowerCase().includes("reading"));
  const writing = sections.filter((s) => String(s.sectionType).toLowerCase().includes("writing"));
  const speaking = sections.filter((s) => String(s.sectionType).toLowerCase().includes("speaking"));

  if (listening.length !== 4) throw new Error("Full mock must include 4 listening sections.");
  if (reading.length !== 3) throw new Error("Full mock must include 3 reading passages.");
  if (writing.length !== 2) throw new Error("Full mock must include 2 writing tasks.");
  if (speaking.length !== 3) throw new Error("Full mock must include 3 speaking parts.");

  const listeningCounts = listening
    .slice()
    .sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0))
    .map((s) => flattenQuestions(s).length);
  if (listeningCounts.some((c) => c !== 10)) {
    throw new Error("Each listening section must include exactly 10 questions.");
  }

  const readingOrdered = reading.slice().sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
  const readingCounts = readingOrdered.map((s) => flattenQuestions(s).length);
  const expectedReading = [13, 13, 14];
  for (let i = 0; i < expectedReading.length; i++) {
    if (readingCounts[i] !== expectedReading[i]) {
      throw new Error("Reading must have question distribution 13/13/14 across passages 1-3.");
    }
  }
  if (opts?.enforceReadingWordCount !== false) {
    const readingWcViolations: string[] = [];
    for (const s of readingOrdered) {
      const pn = Number(s.partNumber || 0) || 0;
      const wc = countWords(String(s.passage || ""));
      if (wc < 700 || wc > 1000) readingWcViolations.push(`passage ${pn}: ${wc} words`);
    }
    if (readingWcViolations.length > 0) {
      throw new Error(`Reading passages word count must be 700–1000 words (${readingWcViolations.join(", ")}).`);
    }
  }
  validateQuestionsBasics(sections);
}

function validateOfficialModuleParity(
  module: "listening" | "reading" | "writing" | "speaking",
  input: z.infer<typeof AIGeneratedFullMockSchema>,
  opts?: { enforceReadingWordCount?: boolean }
) {
  const sections = input.sections;
  const type = (v: unknown) => String(v || "").toLowerCase();

  if (module === "listening") {
    const listening = sections.filter((s) => type(s.sectionType).includes("listening"));
    if (listening.length !== 4) throw new Error("Listening must include 4 sections.");
    const ordered = listening.slice().sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
    for (let i = 0; i < 4; i++) {
      const pn = Number(ordered[i]?.partNumber || 0);
      if (pn !== i + 1) throw new Error("Listening sections must have partNumber 1..4.");
      const c = flattenQuestions(ordered[i]).length;
      if (c !== 10) throw new Error("Each listening section must include exactly 10 questions.");
    }
    validateQuestionsBasics(listening);
    return;
  }

  if (module === "reading") {
    const reading = sections.filter((s) => type(s.sectionType).includes("reading"));
    if (reading.length !== 3) throw new Error("Reading must include 3 passages.");
    const ordered = reading.slice().sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
    const expected = [13, 13, 14];
    for (let i = 0; i < 3; i++) {
      const pn = Number(ordered[i]?.partNumber || 0);
      if (pn !== i + 1) throw new Error("Reading passages must have partNumber 1..3.");
      const c = flattenQuestions(ordered[i]).length;
      if (c !== expected[i]) throw new Error("Reading must have question distribution 13/13/14.");
    }
    if (opts?.enforceReadingWordCount !== false) {
      const wcViolations: string[] = [];
      for (let i = 0; i < 3; i++) {
        const pn = Number(ordered[i]?.partNumber || 0);
        const wc = countWords(String(ordered[i].passage || ""));
        if (wc < 700 || wc > 1000) wcViolations.push(`passage ${pn}: ${wc} words`);
      }
      if (wcViolations.length > 0) {
        throw new Error(`Reading passages word count must be 700–1000 words (${wcViolations.join(", ")}).`);
      }
    }
    validateQuestionsBasics(reading);
    return;
  }

  if (module === "writing") {
    const writing = sections.filter((s) => type(s.sectionType).includes("writing"));
    if (writing.length !== 2) throw new Error("Writing must include Task 1 and Task 2 as two sections.");
    const ordered = writing.slice().sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
    const p1 = Number(ordered[0]?.partNumber || 0);
    const p2 = Number(ordered[1]?.partNumber || 0);
    if (p1 !== 1 || p2 !== 2) throw new Error("Writing sections must have partNumber 1 and 2.");
    const i1 = String(ordered[0].instruction || ordered[0].instructions || "");
    const i2 = String(ordered[1].instruction || ordered[1].instructions || "");
    if (!i1.toLowerCase().includes("20")) throw new Error("Writing Task 1 must include 20 minutes instruction.");
    if (!i2.toLowerCase().includes("40")) throw new Error("Writing Task 2 must include 40 minutes instruction.");
    const q1 = flattenQuestions(ordered[0]);
    const q2 = flattenQuestions(ordered[1]);
    if (q1.length !== 1 || String(q1[0]?.type) !== "essay") throw new Error("Writing Task 1 must contain one essay question.");
    if (q2.length !== 1 || String(q2[0]?.type) !== "essay") throw new Error("Writing Task 2 must contain one essay question.");
    validateQuestionsBasics(writing);
    return;
  }

  const speaking = sections.filter((s) => type(s.sectionType).includes("speaking"));
  if (speaking.length !== 3) throw new Error("Speaking must include Part 1, 2, 3 as three sections.");
  const ordered = speaking.slice().sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
  for (let i = 0; i < 3; i++) {
    const pn = Number(ordered[i]?.partNumber || 0);
    if (pn !== i + 1) throw new Error("Speaking parts must have partNumber 1..3.");
  }
  const part2Questions = flattenQuestions(ordered[1]);
  if (part2Questions.length !== 1) throw new Error("Speaking Part 2 must include exactly one speaking question.");
  const q = part2Questions[0];
  if (String(q.type) !== "speaking") throw new Error("Speaking Part 2 question type must be speaking.");
  if (!q.speakingPrompt || String(q.speakingPrompt).trim().length === 0) throw new Error("Speaking Part 2 must include speakingPrompt.");
  if (Number(q.speakingDuration) !== 120) throw new Error("Speaking Part 2 speakingDuration must be 120.");
  validateQuestionsBasics(speaking);
}

export async function generateTest(
  req: Request,
  forcedExamType?: "mock" | "practice"
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin"].includes(session.user?.role as string)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      module,
      title,
      topic,
      difficulty,
      accessLevel,
      questionCount = 5,
      questionTypes = ["mixed"],
      examType: examTypeRaw = "practice",
      ieltsType = "Academic",
      listeningTopic,
      listeningTitle,
      readingTopic,
      readingTitle,
      writingTopic,
      writingTitle,
      speakingTopic,
      speakingTitle,
    } = body;

    if (!module) {
      return NextResponse.json({ success: false, error: "Module is required" }, { status: 400 });
    }

    const examType = forcedExamType || String(examTypeRaw || "practice");
    if (examType !== "mock" && examType !== "practice") {
      return NextResponse.json({ success: false, error: "Invalid examType" }, { status: 400 });
    }
    if (forcedExamType === "mock" && String(module) !== "full") {
      return NextResponse.json(
        { success: false, error: 'Mock generation route requires module="full".' },
        { status: 400 }
      );
    }
    if (forcedExamType === "practice" && String(module) === "full") {
      return NextResponse.json(
        { success: false, error: 'Practice generation route does not support module="full".' },
        { status: 400 }
      );
    }

    const resolvedTitle =
      title ||
      `IELTS ${examType === "mock" ? "Mock" : "Practice"} — ${topic || "General"} (${module})`;

    await dbConnect();

    let prompt = "";
    const isOfficialPracticeModule =
      examType === "practice" && ["listening", "reading", "writing", "speaking"].includes(String(module));
    const enforceReadingWordCount = false;

    if (module === "full") {
      const str = (v: unknown) => (typeof v === "string" ? v : undefined);
      prompt = buildFullMockPrompt(
        topic,
        difficulty,
        Number(questionCount) || 32,
        ieltsType,
        {
          listeningTopic: str(listeningTopic),
          listeningTitle: str(listeningTitle),
          readingTopic: str(readingTopic),
          readingTitle: str(readingTitle),
          writingTopic: str(writingTopic),
          writingTitle: str(writingTitle),
          speakingTopic: str(speakingTopic),
          speakingTitle: str(speakingTitle),
        }
      );
    } else if (isOfficialPracticeModule && module === "listening") {
      prompt = buildOfficialListeningModulePrompt(topic, difficulty, ieltsType, listeningTitle);
    } else if (isOfficialPracticeModule && module === "reading") {
      prompt = buildOfficialReadingModulePrompt(topic, difficulty, ieltsType, readingTitle);
    } else if (isOfficialPracticeModule && module === "writing") {
      prompt = buildOfficialWritingModulePrompt(topic, difficulty, ieltsType, writingTitle);
    } else if (isOfficialPracticeModule && module === "speaking") {
      prompt = buildOfficialSpeakingModulePrompt(topic, ieltsType, speakingTitle);
    } else if (module === "writing") {
      prompt = buildWritingPrompt(topic, difficulty, examType, ieltsType);
    } else if (module === "speaking") {
      prompt = buildSpeakingPrompt(topic, examType, ieltsType);
    } else {
      prompt = buildReadingListeningPrompt(
        module,
        topic,
        difficulty,
        Number(questionCount) || 5,
        questionTypes,
        examType,
        ieltsType
      );
    }

    let aiData: Record<string, unknown> | null = null;
    let lastValidationError = "";
    let lastJsonText = "";

    const attemptLimit =
      module === "full"
        ? 3
        : isOfficialPracticeModule && (module === "reading" || module === "listening")
          ? 4
          : isOfficialPracticeModule
            ? 3
            : 2;
    const maxTokens =
      module === "full"
        ? 16000
        : isOfficialPracticeModule && module === "reading"
          ? 16000
          : isOfficialPracticeModule && module === "listening"
            ? 12000
          : 8192;

    for (let attempt = 0; attempt < attemptLimit; attempt++) {
      try {
        const isReadingWordCountError =
          module === "reading" &&
          /reading passages word count must be 700.?1000 words/i.test(lastValidationError);
        const shouldRepair =
          ((attempt >= 2 && !isReadingWordCountError) || (attempt >= 1 && isReadingWordCountError)) &&
          isOfficialPracticeModule &&
          (module === "reading" || module === "listening") &&
          lastJsonText.length > 0;

        const extraGuidance =
          attempt > 0 && module === "reading" && /700.?1000/i.test(lastValidationError)
            ? '\n\nExtra requirement: For EACH reading_passage, "passage" MUST be 820–900 words (aim ~850) and within the strict 700–1000 validation range. Do NOT output shorter summaries.'
            : "";

        const repairFocus =
          shouldRepair && isReadingWordCountError
            ? '\n\nRepair focus: ONLY edit the "passage" strings in the reading_passage sections to meet the 700–1000 word requirement (target 820–900). Do not change any group titles, instructions, questions, options, correctAnswer, marks, section count, partNumber, or question distribution. If a passage is too short, append additional paragraphs at the END that add consistent detail without contradicting earlier content.'
            : "";

        const userPrompt = shouldRepair
          ? `${prompt}

Your previous JSON failed strict validation: ${lastValidationError}

Repair the JSON below by making the MINIMUM necessary changes to satisfy all requirements. Do not remove required sections or question counts. Preserve the schema shape. Return ONLY valid JSON (no markdown).

${repairFocus}

JSON to repair:
${lastJsonText}
${extraGuidance}`
          : attempt === 0
            ? prompt
            : `${prompt}\n\nThe previous JSON violated strict IELTS parity requirements: ${lastValidationError}\nRegenerate the ENTIRE JSON from scratch and satisfy all requirements exactly.${extraGuidance}`;

        const temperature =
          attempt === 0 ? 0.62 : attempt === 1 ? 0.45 : 0.3;

        const completion = await openai.chat.completions.create({
          model: GENERATION_MODEL,
          messages: [
            { role: "system", content: AUTHENTIC_IELTS_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature,
          max_tokens: maxTokens,
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          lastValidationError = "Empty response from language model";
          continue;
        }
        lastJsonText = responseContent;

        let parsed = JSON.parse(responseContent) as Record<string, unknown>;
        if (module === "full") {
          let full = AIGeneratedFullMockSchema.parse(parsed);
          if (enforceReadingWordCount) {
            full = await maybeAutoFixReadingPassages({
              full,
              topic: String(topic || "General"),
              difficulty: String(difficulty || "medium"),
              ieltsType: String(ieltsType || "Academic"),
            });
          }
          validateFullMockParity(full, { enforceReadingWordCount });
          parsed = full as unknown as Record<string, unknown>;
        } else if (isOfficialPracticeModule) {
          let full = AIGeneratedFullMockSchema.parse(parsed);
          if (module === "reading" && enforceReadingWordCount) {
            full = await maybeAutoFixReadingPassages({
              full,
              topic: String(topic || "General"),
              difficulty: String(difficulty || "medium"),
              ieltsType: String(ieltsType || "Academic"),
            });
          }
          validateOfficialModuleParity(module, full, { enforceReadingWordCount });
          parsed = full as unknown as Record<string, unknown>;
        }

        lastJsonText = JSON.stringify(parsed);
        aiData = parsed;
        break;
      } catch (e: any) {
        lastValidationError = e?.message || "AI output validation failed";
      }
    }

    if (!aiData) {
      throw new Error(lastValidationError || "AI output failed validation");
    }

    const baseSlug = resolvedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    const isMock = examType === "mock";
    const testModule = module === "full" ? "full" : module;

    const newTest = await Test.create({
      title: resolvedTitle,
      slug: uniqueSlug,
      examType: isMock ? "mock" : "practice",
      type: ieltsType,
      module: testModule,
      accessLevel: accessLevel || "free",
      status: "draft",
      difficulty: difficulty || "medium",
      duration: isMock
        ? durationForMockModule(module)
        : module === "writing"
          ? 60
          : module === "speaking"
            ? 15
            : 40,
      totalQuestions: 0,
      createdBy: session.user.id || "000000000000000000000000",
    });

    let totalQuestions = 0;

    const sectionsPayload: AISectionPayload[] = [];

    if (module === "full") {
      const full = AIGeneratedFullMockSchema.parse(aiData);
      sectionsPayload.push(...(full.sections as AISectionPayload[]));
    } else if (isOfficialPracticeModule) {
      const full = AIGeneratedFullMockSchema.parse(aiData);
      sectionsPayload.push(...(full.sections as AISectionPayload[]));
    } else {
      sectionsPayload.push({
        sectionTitle: (aiData.sectionTitle as string) || "Section 1",
        sectionType: mapToSectionType(undefined, module),
        passage: (aiData as { groups?: { passage?: string }[] }).groups?.[0]?.passage || "",
        instruction: "Read the instructions carefully.",
        groups: (aiData.groups as unknown[]) || [],
      });
    }

    const globalOrderForFull = (st: SectionSchemaType, partNumber: number) => {
      const pn = Math.max(1, Math.floor(partNumber || 1));
      if (st === "listening_part") return pn; // 1..4
      if (st === "reading_passage") return 4 + pn; // 5..7
      if (st === "writing_task") return 7 + pn; // 8..9
      return 9 + pn; // speaking_part: 10..12
    };

    const sectionSkill = (st: SectionSchemaType): IQuestion["skill"] => {
      if (st === "listening_part") return "listening";
      if (st === "reading_passage") return "reading";
      if (st === "writing_task") return "writing";
      return "speaking";
    };

    const ordered = sectionsPayload
      .map((sec, idx) => {
        const st = mapToSectionType(sec.sectionType, module === "full" ? "" : module);
        const resolved = module === "full" ? st : mapToSectionType(undefined, module);
        const pn = typeof sec.partNumber === "number" ? sec.partNumber : idx + 1;
        const order =
          module === "full"
            ? globalOrderForFull(resolved, pn)
            : isOfficialPracticeModule
            ? pn
            : idx + 1;
        return { sec, resolved, pn, order };
      })
      .sort((a, b) => a.order - b.order);

    for (let s = 0; s < ordered.length; s++) {
      const { sec, resolved: sectionTypeResolved, pn, order } = ordered[s];
      const groups = (sec.groups || []) as Parameters<typeof persistGroupsForSection>[2];

      const passageRaw =
        sectionTypeResolved === "listening_part"
          ? buildListeningTranscriptFromPayload(
              sec as {
                passage?: string;
                groups?: Array<{ passage?: string }>;
              }
            ) || sec.passage || ""
          : sec.passage || "";

      const passageForSection = sanitizeIeltsCandidateText(passageRaw);
      const instructions = sanitizeIeltsCandidateText(
        sec.instructions || sec.instruction || "Read the instructions carefully."
      );

      const newSection = await Section.create({
        testId: newTest._id,
        title: sanitizeIeltsCandidateText(sec.sectionTitle || `Section ${order}`),
        order,
        sectionType: sectionTypeResolved,
        partNumber: module === "full" ? pn : undefined,
        instructions,
        ...(sectionTypeResolved === "reading_passage" ? { passageText: passageForSection } : {}),
        ...(sectionTypeResolved === "listening_part" ? { audioTranscript: passageForSection } : {}),
        totalQuestions: 0,
      });

      const added = await persistGroupsForSection(
        newTest._id,
        newSection._id,
        groups,
        totalQuestions + 1,
        sectionSkill(sectionTypeResolved)
      );

      totalQuestions += added;
      newSection.totalQuestions = added;
      await newSection.save();

      if (
        sectionTypeResolved === "listening_part" &&
        passageForSection.trim().length >= 20
      ) {
        try {
          const tts = await synthesizeListeningAudioToS3(
            passageForSection,
            `listen-${newTest._id}-${String(pn)}`
          );
          if (tts?.url) {
            await Section.findByIdAndUpdate(newSection._id, {
              audioUrl: tts.url,
              audioTranscript: passageForSection,
            });
          }
        } catch (ttsErr) {
          console.error("Listening TTS / S3 failed:", ttsErr);
        }
      }
    }

    if (totalQuestions === 0) {
      await Section.deleteMany({ testId: newTest._id });
      await Test.findByIdAndDelete(newTest._id);
      throw new Error(
        "No questions were returned. Try again, adjust the topic, or use a single module instead of full mock."
      );
    }

    newTest.totalQuestions = totalQuestions;
    await newTest.save();

    return NextResponse.json({
      success: true,
      message: "Test generated successfully!",
      testId: newTest._id,
      model: GENERATION_MODEL,
    });
  } catch (error: unknown) {
    console.error("Test generate error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return generateTest(req);
}
