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
    questions?: Array<{
      type?: string;
      text?: string;
      options?: unknown[];
      correctAnswer?: string;
      marks?: number;
    }>;
  }>,
  startQuestionNumber: number
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
      instructions: sanitizeIeltsCandidateText(groupData.instruction || ""),
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
        marks: qData.marks || 1,
        order: j + 1,
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
        { "type": "short_answer", "text": "Question 1?", "marks": 1 },
        { "type": "short_answer", "text": "Question 2?", "marks": 1 }
      ]
    },
    {
      "title": "Part 2: Long Turn (Cue Card)",
      "instruction": "Describe a time when you... You should say: where it was, when it was, who you were with, and explain why you remember it so well.",
      "questions": [
        { "type": "essay", "text": "Talk about the topic on your cue card.", "marks": 1 }
      ]
    },
    {
      "title": "Part 3: Discussion",
      "instruction": "Let's discuss this topic further.",
      "questions": [
        { "type": "short_answer", "text": "Question 1?", "marks": 1 },
        { "type": "short_answer", "text": "Question 2?", "marks": 1 }
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
    ? ` Use this exact sectionTitle for the ${label} section in the JSON: "${ti}".`
    : "";
  return `${label}: all content in this section must follow the theme "${t}".${titlePart}`;
}

function buildFullMockPrompt(
  topic: string,
  difficulty: string,
  questionCount: number,
  ieltsType: string,
  hints: FullMockSectionHints = {}
) {
  const target = Math.max(24, Math.min(48, questionCount || 32));
  const per = Math.max(6, Math.floor(target / 4));
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
Approximate scale: about ${target} scored items (listening + reading; writing = 2 tasks; speaking = multiple prompts across parts).

Every section's titles, instructions, passages, and questions must read as professional test content. Do not use headings like "Mock Test" or "Sample" in student-facing strings; use neutral labels unless a section title was given above.

Return ONLY valid JSON (no markdown) in this shape:
{
  "sections": [
    {
      "sectionTitle": "Listening",
      "sectionType": "listening_part",
      "instruction": "You will hear a number of recordings. Answer the questions.",
      "passage": "Full transcript text that questions refer to.",
      "groups": [
        {
          "title": "Questions 1-${per}",
          "instruction": "Choose the correct letter A, B, or C.",
          "questions": [
            { "type": "multiple_choice", "text": "...", "options": ["A ...", "B ...", "C ..."], "correctAnswer": "A", "marks": 1 }
          ]
        }
      ]
    },
    {
      "sectionTitle": "Reading",
      "sectionType": "reading_passage",
      "instruction": "Read the passage and answer the questions.",
      "passage": "One long academic-style passage.",
      "groups": [ ... multiple_choice and true_false_not_given ... ]
    },
    {
      "sectionTitle": "Writing",
      "sectionType": "writing_task",
      "instruction": "Follow the tasks below.",
      "passage": "",
      "groups": [
        { "title": "Task 1", "instruction": "20 minutes", "questions": [ { "type": "essay", "text": "...", "marks": 1 } ] },
        { "title": "Task 2", "instruction": "40 minutes", "questions": [ { "type": "essay", "text": "...", "marks": 1 } ] }
      ]
    },
    {
      "sectionTitle": "Speaking",
      "sectionType": "speaking_part",
      "instruction": "Answer each part naturally.",
      "passage": "",
      "groups": [
        { "title": "Part 1", "instruction": "Interview", "questions": [ { "type": "short_answer", "text": "...", "marks": 1 } ] },
        { "title": "Part 2", "instruction": "Cue card", "questions": [ { "type": "essay", "text": "Describe ...", "marks": 1 } ] },
        { "title": "Part 3", "instruction": "Discussion", "questions": [ { "type": "short_answer", "text": "...", "marks": 1 } ] }
      ]
    }
  ]
}

Use only these question "type" values: multiple_choice, true_false_not_given, short_answer, essay.
Every multiple_choice must have four options (labels A–D) and a correctAnswer matching one label.`;
}

export async function POST(req: Request) {
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
      examType = "practice",
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

    const resolvedTitle =
      title ||
      `IELTS ${examType === "mock" ? "Mock" : "Practice"} — ${topic || "General"} (${module})`;

    await dbConnect();

    let prompt = "";

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

    const completion = await openai.chat.completions.create({
      model: GENERATION_MODEL,
      messages: [
        { role: "system", content: AUTHENTIC_IELTS_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.72,
      max_tokens: module === "full" ? 12000 : 8192,
    });

    const responseContent = completion.choices[0].message.content;
    let aiData: Record<string, unknown>;
    if (responseContent) {
      aiData = JSON.parse(responseContent);
    } else {
      throw new Error("Empty response from language model");
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
      if (!Array.isArray(aiData.sections) || aiData.sections.length === 0) {
        throw new Error(
          "Full mock response was incomplete (no sections). Try again, or generate one module at a time."
        );
      }
      sectionsPayload.push(...(aiData.sections as AISectionPayload[]));
    } else {
      sectionsPayload.push({
        sectionTitle: (aiData.sectionTitle as string) || "Section 1",
        sectionType: mapToSectionType(undefined, module),
        passage: (aiData as { groups?: { passage?: string }[] }).groups?.[0]?.passage || "",
        instruction: "Read the instructions carefully.",
        groups: (aiData.groups as unknown[]) || [],
      });
    }

    for (let s = 0; s < sectionsPayload.length; s++) {
      const sec = sectionsPayload[s];
      const groups = (sec.groups || []) as Parameters<typeof persistGroupsForSection>[2];
      const st = mapToSectionType(sec.sectionType, module === "full" ? "" : module);
      const sectionTypeResolved =
        module === "full" ? st : mapToSectionType(undefined, module);

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

      const newSection = await Section.create({
        testId: newTest._id,
        title: sanitizeIeltsCandidateText(sec.sectionTitle || `Section ${s + 1}`),
        order: s + 1,
        sectionType: sectionTypeResolved,
        instructions: sanitizeIeltsCandidateText(
          sec.instructions || sec.instruction || "Read the instructions carefully."
        ),
        passageText: passageForSection,
        totalQuestions: 0,
      });

      const added = await persistGroupsForSection(
        newTest._id,
        newSection._id,
        groups,
        totalQuestions + 1
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
            `listen-${newTest._id}-${s + 1}`
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
