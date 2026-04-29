import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";
import {
  AUTHENTIC_IELTS_SYSTEM,
  GENERATION_MODEL,
  sanitizeIeltsCandidateText,
} from "@/lib/ieltsGeneration";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

const QUESTION_TYPE_ENUM = new Set([
  "multiple_choice",
  "true_false_not_given",
  "fill_blank",
  "matching",
  "sentence_completion",
  "short_answer",
  "essay",
  "speaking",
  "matching_headings",
  "summary_completion",
]);

const MCQ_LABELS = ["A", "B", "C", "D"] as const;

function mapRequestQuestionType(raw: string): string {
  const t = String(raw || "short_answer").toLowerCase();
  if (t === "yes_no_not_given") return "true_false_not_given";
  return t;
}

function coerceSchemaQuestionType(mapped: string): string {
  if (QUESTION_TYPE_ENUM.has(mapped)) return mapped;
  return "short_answer";
}

function normalizeTfngAnswer(ca: unknown): string | undefined {
  if (ca == null) return undefined;
  const s = String(ca).trim();
  if (!s) return undefined;
  const low = s.toLowerCase();
  if (low === "true" || low === "t") return "True";
  if (low === "false" || low === "f") return "False";
  if (low === "not given" || low === "ng" || low === "notgiven") return "Not Given";
  if (low === "yes" || low === "y") return "True";
  if (low === "no" || low === "n") return "False";
  return s;
}

function normalizeMcqOptions(raw: unknown): { label: string; text: string }[] {
  const arr = Array.isArray(raw) ? raw : [];
  const slots: { label: string; text: string }[] = MCQ_LABELS.map((L) => ({
    label: L,
    text: "",
  }));

  for (const item of arr) {
    const o = item as { label?: string; text?: string };
    let label = String(o?.label ?? "")
      .toUpperCase()
      .replace(/[^A-D]/g, "")
      .slice(0, 1);
    const text = sanitizeIeltsCandidateText(String(o?.text ?? ""));
    if (!label && text) continue;
    if (!label) {
      const idx = slots.findIndex((s) => !s.text);
      if (idx >= 0) {
        slots[idx] = { label: MCQ_LABELS[idx], text };
      }
      continue;
    }
    const idx = MCQ_LABELS.indexOf(label as (typeof MCQ_LABELS)[number]);
    if (idx >= 0 && text) slots[idx] = { label, text };
  }

  for (let i = 0; i < arr.length && i < 4; i++) {
    const o = arr[i] as { label?: string; text?: string };
    const text = sanitizeIeltsCandidateText(String(o?.text ?? ""));
    if (text && !slots[i].text) {
      slots[i] = { label: MCQ_LABELS[i], text };
    }
  }

  return slots;
}

function normalizeMcqCorrectAnswer(
  ca: unknown,
  options: { label: string; text: string }[]
): string | undefined {
  if (ca == null) return undefined;
  const s = String(ca).trim();
  if (!s) return undefined;
  if (/^[A-D]$/i.test(s)) return s.toUpperCase();
  const t = s.toLowerCase();
  for (const o of options) {
    if (!o.text) continue;
    if (t === o.text.toLowerCase()) return o.label;
  }
  return s;
}

/**
 * POST /api/ai/generate-questions
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { message: "Unauthorized", error: "Unauthorized" },
        { status: 401 }
      );
    }

    await rateLimitOrThrow(session.user.id, "ai_generate_questions");

    const body = await req.json();
    const {
      module,
      questionType,
      topic,
      count = 5,
      difficulty = "medium",
      testId,
      sectionId,
      groupId,
      startQuestionNumber,
    } = body;

    if (!module || !questionType || !topic || !testId || !sectionId || !groupId) {
      return NextResponse.json(
        { message: "Missing required fields", error: "Missing required fields" },
        { status: 400 }
      );
    }

    const clampedCount = Math.min(Math.max(Number(count), 1), 20);
    const startNum = Math.max(1, Math.floor(Number(startQuestionNumber)) || 1);

    const mappedType = mapRequestQuestionType(String(questionType));
    const schemaQuestionType = coerceSchemaQuestionType(mappedType);

    const typeInstructions: Record<string, string> = {
      multiple_choice: `Each question must have exactly 4 options (labels A–D) with distinct, plausible distractors. correctAnswer must be exactly one of "A","B","C","D".`,
      true_false_not_given: `Each question answer must be exactly "True", "False", or "Not Given" (capital T/F).`,
      fill_blank: `Each questionText must include ___ for the blank. correctAnswer is the exact word or short phrase (≤4 words) that fills it.`,
      short_answer: `Each question requires a brief factual answer. correctAnswer: model answer (≤5 words unless a proper noun needs more).`,
      matching: `Each question states what to match; correctAnswer identifies the correct pairing in clear text.`,
      sentence_completion: `Each question is an incomplete sentence; correctAnswer is the best completion (≤8 words).`,
      matching_headings: `IELTS-style: questionText references a paragraph or idea; options are heading texts; correctAnswer is the heading letter (A–F) or the chosen heading text.`,
      summary_completion: `Summary with gaps (use ___); correctAnswer is the word/phrase for each gap.`,
      essay: `A single clear writing task prompt. Leave options [] and correctAnswer "". Fill scoringCriteria with brief band-relevant criteria.`,
      speaking: `A natural examiner-style prompt. options [] and correctAnswer "". Use speakingPrompt for follow-up bullet ideas.`,
    };

    const typeHint =
      typeInstructions[schemaQuestionType] ??
      `Provide appropriate questions for the type "${schemaQuestionType}".`;

    const systemPrompt = `${AUTHENTIC_IELTS_SYSTEM}

Task: generate only the requested questions as JSON. You are filling an existing test section.
Module: ${String(module).toUpperCase()}. Difficulty: ${difficulty}. Topic/context: ${String(topic).slice(0, 500)}. Question type: ${schemaQuestionType}.
${typeHint}
You MUST return a single JSON object (no markdown) with exactly one top-level key "questions" whose value is an array of length exactly ${clampedCount}.
Every questionText must be non-empty exam-style text.`;

    const userPrompt = `Generate exactly ${clampedCount} IELTS ${module} questions on the topic/context: "${String(topic).slice(0, 800)}".
Question type: ${schemaQuestionType}.
Use question numbers ${startNum} through ${startNum + clampedCount - 1} only.

Return ONLY valid JSON:
{ "questions": [ /* exactly ${clampedCount} objects */ ] }

Each object:
{
  "questionNumber": <number>,
  "order": <same as questionNumber>,
  "questionText": "<stem or prompt — required, non-empty>",
  "questionType": "${schemaQuestionType}",
  "options": [...] or [],
  "correctAnswer": "<string>" or "",
  "explanation": "<short, for teachers>",
  "scoringCriteria": "<essay/speaking only>" or "",
  "speakingPrompt": "<speaking only>" or "",
  "marks": ${schemaQuestionType === "essay" || schemaQuestionType === "speaking" ? 9 : 1}
}

Output must be valid JSON only.`;

    const response = await openai.chat.completions.create({
      model: GENERATION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: schemaQuestionType === "multiple_choice" ? 0.55 : 0.65,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in model response", error: "Invalid JSON in model response" },
        { status: 500 }
      );
    }

    const rawList: unknown[] = Array.isArray(parsed)
      ? (parsed as unknown[])
      : parsed &&
          typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { questions?: unknown[] }).questions)
        ? (parsed as { questions: unknown[] }).questions
        : parsed &&
            typeof parsed === "object" &&
            parsed !== null &&
            Array.isArray((parsed as { items?: unknown[] }).items)
          ? (parsed as { items: unknown[] }).items
          : [];

    const sliced = rawList.slice(0, clampedCount);

    if (!sliced.length) {
      return NextResponse.json(
        { message: "No questions in model response", error: "No questions in model response" },
        { status: 500 }
      );
    }

    const questions: Record<string, unknown>[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < sliced.length; i++) {
      const q = sliced[i] as Record<string, unknown>;
      const num = startNum + i;
      let questionText = sanitizeIeltsCandidateText(String(q.questionText ?? ""));
      if (!questionText.trim()) {
        warnings.push(`Skipped item ${i + 1}: empty questionText`);
        continue;
      }

      let options: { label: string; text: string }[] | undefined;
      let correctAnswer: string | undefined;

      if (schemaQuestionType === "multiple_choice") {
        const mcqOpts = normalizeMcqOptions(q.options);
        const allFilled = mcqOpts.every((o) => o.text.trim().length > 0);
        if (!allFilled) {
          warnings.push(`Q${num}: incomplete MCQ options — retry or edit after save`);
        }
        options = mcqOpts;
        correctAnswer = normalizeMcqCorrectAnswer(q.correctAnswer, mcqOpts);
        if (!correctAnswer || !/^[A-D]$/.test(correctAnswer)) {
          const firstOk = mcqOpts.find((o) => o.text.trim());
          correctAnswer = firstOk?.label ?? "A";
          warnings.push(
            `Q${num}: could not read correct MCQ letter — defaulted to ${correctAnswer}; fix in preview if wrong`
          );
        }
      } else if (schemaQuestionType === "true_false_not_given") {
        correctAnswer = normalizeTfngAnswer(q.correctAnswer);
        if (
          !correctAnswer ||
          !["True", "False", "Not Given"].includes(correctAnswer)
        ) {
          correctAnswer = "Not Given";
          warnings.push(`Q${num}: TFNG answer normalized — verify in preview`);
        }
      } else {
        const rawCa = q.correctAnswer;
        if (rawCa != null && rawCa !== "") {
          correctAnswer =
            typeof rawCa === "string"
              ? rawCa.trim()
              : String(rawCa);
        }
        const rawOpts = q.options;
        if (Array.isArray(rawOpts) && rawOpts.length > 0) {
          options = rawOpts.map((item: unknown) => {
            const o = item as { label?: string; text?: string };
            return {
              label: String(o?.label ?? ""),
              text: sanitizeIeltsCandidateText(String(o?.text ?? "")),
            };
          });
        }
      }

      const marks =
        schemaQuestionType === "essay" || schemaQuestionType === "speaking"
          ? Math.min(9, Math.max(1, Number(q.marks) || 9))
          : Math.min(10, Math.max(1, Number(q.marks) || 1));

      questions.push({
        testId,
        sectionId,
        groupId,
        questionNumber: num,
        order: num,
        questionText,
        questionType: schemaQuestionType,
        ...(options && options.length > 0 ? { options } : {}),
        ...(correctAnswer !== undefined && correctAnswer !== ""
          ? { correctAnswer }
          : {}),
        explanation: sanitizeIeltsCandidateText(String(q.explanation ?? "")),
        ...(q.scoringCriteria
          ? {
              scoringCriteria: sanitizeIeltsCandidateText(
                String(q.scoringCriteria)
              ),
            }
          : {}),
        ...(q.speakingPrompt
          ? {
              speakingPrompt: sanitizeIeltsCandidateText(
                String(q.speakingPrompt)
              ),
            }
          : {}),
        marks,
      });
    }

    if (questions.length === 0) {
      return NextResponse.json(
        {
          message: "No valid questions after validation (empty stems or bad shape)",
          error: "No valid questions after validation",
        },
        { status: 500 }
      );
    }

    if (questions.length < clampedCount) {
      warnings.push(
        `Got ${questions.length} of ${clampedCount} questions — add more manually or generate again`
      );
    }

    return withCacheHeaders(
      NextResponse.json({
        questions,
        count: questions.length,
        ...(warnings.length ? { warnings } : {}),
      }),
      { kind: "no-store" }
    );
  } catch (error: unknown) {
    if ((error as any)?.message === "rate_limited") {
      const retryAfter = Number((error as any)?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please slow down.", error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    console.error("AI generate-questions error:", error);
    const msg =
      error instanceof Error ? error.message : "AI generation failed";
    return NextResponse.json({ message: msg, error: msg }, { status: 500 });
  }
}
