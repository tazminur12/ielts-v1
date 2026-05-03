import OpenAI from "openai";

export const WRITING_EVALUATION_SYSTEM = `You are an expert IELTS Writing examiner with 10+ years of experience (British Council / IDP standards). You must follow the official IELTS Writing band descriptors strictly and score honestly. Do not inflate scores.

Evaluate the candidate response using these four criteria (0-9 band):
- Task 1: Task Achievement
- Task 2: Task Response
- Coherence and Cohesion
- Lexical Resource
- Grammatical Range and Accuracy

Return ONLY valid JSON. No markdown. No commentary. No code fences.

Your JSON MUST match this shape exactly:
{
  "criteria": {
    "taskAchievement": { "score": number, "feedback": string, "tips": string[] },
    "coherenceCohesion": { "score": number, "feedback": string, "tips": string[] },
    "lexicalResource": { "score": number, "feedback": string, "tips": string[] },
    "grammaticalRange": { "score": number, "feedback": string, "tips": string[] }
  },
  "overallFeedback": string,
  "overallSuggestions": string[]
}

Rules:
- "score" must be between 0 and 9. Use 0.5 increments only if necessary.
- "feedback" must be specific to the candidate response (quote or reference features; avoid generic advice).
- "tips" must contain 2-3 concrete improvement actions for that criterion.
- "overallFeedback" must be a concise summary (3-6 sentences).
- "overallSuggestions" must be 3-6 actionable items, non-redundant.`;

export type WritingTaskType = "task1" | "task2";

export type WritingCriterionKey =
  | "taskAchievement"
  | "coherenceCohesion"
  | "lexicalResource"
  | "grammaticalRange";

export interface WritingCriterionEvaluation {
  score: number;
  feedback: string;
  tips: string[];
}

export interface WritingEvaluationModelJson {
  criteria: Record<WritingCriterionKey, WritingCriterionEvaluation>;
  overallFeedback: string;
  overallSuggestions: string[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

export function roundToNearestHalf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 2) / 2;
}

export function calculateOverallWritingBand(criteriaScores: number[]): number {
  const valid = criteriaScores.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  const avg = valid.reduce((sum, v) => sum + v, 0) / valid.length;
  return roundToNearestHalf(avg);
}

function normalizeCriterionEvaluation(input: any): WritingCriterionEvaluation {
  const tips = Array.isArray(input?.tips)
    ? input.tips.filter((t: unknown) => typeof t === "string" && t.trim().length > 0).slice(0, 5)
    : [];

  return {
    score: clampScore(input?.score),
    feedback: typeof input?.feedback === "string" && input.feedback.trim().length > 0 ? input.feedback.trim() : "",
    tips,
  };
}

export function parseWritingEvaluationJson(raw: string): WritingEvaluationModelJson {
  const parsed = JSON.parse(raw || "{}");

  const criteria = parsed?.criteria || {};

  const normalized: WritingEvaluationModelJson = {
    criteria: {
      taskAchievement: normalizeCriterionEvaluation(criteria?.taskAchievement),
      coherenceCohesion: normalizeCriterionEvaluation(criteria?.coherenceCohesion),
      lexicalResource: normalizeCriterionEvaluation(criteria?.lexicalResource),
      grammaticalRange: normalizeCriterionEvaluation(criteria?.grammaticalRange),
    },
    overallFeedback:
      typeof parsed?.overallFeedback === "string" && parsed.overallFeedback.trim().length > 0
        ? parsed.overallFeedback.trim()
        : "",
    overallSuggestions: Array.isArray(parsed?.overallSuggestions)
      ? parsed.overallSuggestions
          .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
          .map((t: string) => t.trim())
          .slice(0, 10)
      : [],
  };

  return normalized;
}

export function formatWritingFeedback(evaluation: WritingEvaluationModelJson): string {
  const lines: string[] = [];

  if (evaluation.overallFeedback) {
    lines.push("Overall feedback:");
    lines.push(evaluation.overallFeedback);
  }

  const addCriterion = (title: string, c: WritingCriterionEvaluation) => {
    lines.push("");
    lines.push(`${title}:`);
    if (c.feedback) lines.push(c.feedback);
    if (c.tips.length > 0) {
      lines.push("Tips:");
      for (const tip of c.tips) lines.push(`- ${tip}`);
    }
  };

  addCriterion("Task Achievement / Task Response", evaluation.criteria.taskAchievement);
  addCriterion("Coherence and Cohesion", evaluation.criteria.coherenceCohesion);
  addCriterion("Lexical Resource", evaluation.criteria.lexicalResource);
  addCriterion("Grammatical Range and Accuracy", evaluation.criteria.grammaticalRange);

  return lines.join("\n");
}

export function uniqueSuggestions(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.slice(0, 10);
}

export async function evaluateWritingWithRubric(input: {
  taskType: WritingTaskType;
  prompt: string;
  userResponse: string;
}): Promise<WritingEvaluationModelJson> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: WRITING_EVALUATION_SYSTEM },
      {
        role: "user",
        content: JSON.stringify(
          {
            taskType: input.taskType,
            prompt: input.prompt,
            response: input.userResponse,
          },
          null,
          2
        ),
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  return parseWritingEvaluationJson(raw);
}

