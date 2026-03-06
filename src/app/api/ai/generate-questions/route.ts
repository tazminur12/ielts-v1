import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

/**
 * POST /api/ai/generate-questions
 * Body: {
 *   module: "listening" | "reading" | "writing" | "speaking" | "full"
 *   questionType: "multiple_choice" | "true_false_not_given" | "fill_blank" | "short_answer" | "essay" | "speaking" | ...
 *   topic: string          — e.g. "Climate Change", "Urban Development"
 *   count: number          — 1–20
 *   difficulty: "easy" | "medium" | "hard"
 *   testId: string
 *   sectionId: string
 *   groupId: string
 * }
 * Returns: { questions: IQuestion[] } — ready to insert
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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
    } = body;

    if (!module || !questionType || !topic || !testId || !sectionId || !groupId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const clampedCount = Math.min(Math.max(Number(count), 1), 20);

    /* ── Build the prompt based on question type ── */
    const typeInstructions: Record<string, string> = {
      multiple_choice: `Each question must have exactly 4 options (A, B, C, D) and one correct answer label (e.g. "A").`,
      true_false_not_given: `Each question answer must be exactly "True", "False", or "Not Given".`,
      yes_no_not_given: `Each question answer must be exactly "Yes", "No", or "Not Given".`,
      fill_blank: `Each question is a sentence with a blank (use ___ for the blank). correctAnswer is the word/phrase that fills the blank.`,
      short_answer: `Each question requires a brief answer (max 3 words). correctAnswer is the model answer.`,
      matching: `Each question matches an item to a category. Provide a correctAnswer string.`,
      sentence_completion: `Each question completes a sentence. correctAnswer is the completing phrase (max 5 words).`,
      essay: `Provide a writing task prompt. No options or correctAnswer needed; leave them empty. Include a scoringCriteria field.`,
      speaking: `Provide a speaking question/prompt. No options or correctAnswer needed. Include a speakingPrompt field with discussion points.`,
    };

    const typeHint = typeInstructions[questionType] ?? `Provide appropriate questions for the type "${questionType}".`;

    const systemPrompt = `You are an expert IELTS examiner and test designer with 20+ years of experience.
Generate authentic IELTS-style questions for the ${module.toUpperCase()} module.
Difficulty level: ${difficulty}.
Topic: ${topic}.
Question type: ${questionType}.
${typeHint}
Always return ONLY a valid JSON array. No explanation, no markdown.`;

    const userPrompt = `Generate exactly ${clampedCount} IELTS ${module} questions about "${topic}".
Question type: ${questionType}.

Return a JSON array where each element has this structure:
{
  "questionNumber": <sequential number starting from 1>,
  "order": <same as questionNumber>,
  "questionText": "<the question or prompt>",
  "questionType": "${questionType}",
  "options": [{"label": "A", "text": "..."}, ...] or [] if not applicable,
  "correctAnswer": "<answer string or option label>" or "" if not applicable,
  "explanation": "<brief explanation of the correct answer>",
  "scoringCriteria": "<rubric hints for essay/speaking>" or "",
  "speakingPrompt": "<extended speaking prompt with bullet points>" or "",
  "marks": ${questionType === "essay" ? 9 : questionType === "speaking" ? 9 : 1}
}

Ensure questions are IELTS-authentic, academically appropriate, and at ${difficulty} difficulty.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ message: "AI returned invalid JSON" }, { status: 500 });
    }

    // The model may return { questions: [...] } or just [...]
    const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? parsed.items ?? []);

    if (!rawList.length) {
      return NextResponse.json({ message: "AI generated no questions" }, { status: 500 });
    }

    // Attach DB references
    const questions = rawList.map((q, i) => ({
      testId,
      sectionId,
      groupId,
      questionNumber: Number(q.questionNumber) || i + 1,
      order: Number(q.order) || i + 1,
      questionText: String(q.questionText || ""),
      questionType,
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : undefined,
      correctAnswer: q.correctAnswer || undefined,
      explanation: q.explanation || "",
      scoringCriteria: q.scoringCriteria || undefined,
      speakingPrompt: q.speakingPrompt || undefined,
      marks: Number(q.marks) || 1,
    }));

    return NextResponse.json({ questions, count: questions.length });
  } catch (error: any) {
    console.error("AI generate-questions error:", error);
    return NextResponse.json({ message: error.message || "AI generation failed" }, { status: 500 });
  }
}
