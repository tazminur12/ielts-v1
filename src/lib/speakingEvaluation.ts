import OpenAI from "openai";

export const SPEAKING_EVALUATION_SYSTEM = `You are an expert IELTS Speaking examiner with 10+ years of experience (British Council / IDP standards).

You will be given:
- The speaking part number (1, 2, or 3)
- The prompt/question/cue card
- A transcript of the candidate's spoken response (generated automatically)

Evaluate strictly using IELTS Speaking band descriptors. Do not inflate scores. Be constructive but honest.

Important limitation:
- You are evaluating from TEXT ONLY. You cannot truly hear pronunciation, stress, intonation, or pacing. You must estimate Pronunciation conservatively based on transcript clues (e.g., phonetic spellings, repeated self-corrections, broken chunks, missing endings). If the transcript provides insufficient evidence, do not assume high pronunciation; keep it moderate and state the limitation in feedback.

Return ONLY valid JSON. No markdown. No extra text. No code fences.

Your JSON MUST match this shape exactly:
{
  "criteria": {
    "fluencyCoherence": { "score": number, "feedback": string, "tips": string[] },
    "lexicalResource": { "score": number, "feedback": string, "tips": string[] },
    "grammaticalRange": { "score": number, "feedback": string, "tips": string[] },
    "pronunciation": { "score": number, "feedback": string, "tips": string[] }
  },
  "overallFeedback": string,
  "overallSuggestions": string[]
}

Rules:
- All criterion scores must be between 0 and 9 (0.5 increments allowed).
- Each "tips" must have 2-3 actionable items.
- "overallFeedback" should be 3-6 sentences, referencing what the candidate actually said (or what is missing).
- "overallSuggestions" should be 3-6 non-redundant items.`;

export type SpeakingPartNumber = 1 | 2 | 3;

export type SpeakingCriterionKey =
  | "fluencyCoherence"
  | "lexicalResource"
  | "grammaticalRange"
  | "pronunciation";

export interface SpeakingCriterionEvaluation {
  score: number;
  feedback: string;
  tips: string[];
}

export interface SpeakingEvaluationModelJson {
  criteria: Record<SpeakingCriterionKey, SpeakingCriterionEvaluation>;
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

export function calculateOverallSpeakingBand(criteriaScores: number[]): number {
  const valid = criteriaScores.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  const avg = valid.reduce((sum, v) => sum + v, 0) / valid.length;
  return roundToNearestHalf(avg);
}

function normalizeCriterionEvaluation(input: any): SpeakingCriterionEvaluation {
  const tips = Array.isArray(input?.tips)
    ? input.tips.filter((t: unknown) => typeof t === "string" && t.trim().length > 0).slice(0, 5)
    : [];

  return {
    score: clampScore(input?.score),
    feedback: typeof input?.feedback === "string" && input.feedback.trim().length > 0 ? input.feedback.trim() : "",
    tips,
  };
}

export function parseSpeakingEvaluationJson(raw: string): SpeakingEvaluationModelJson {
  const parsed = JSON.parse(raw || "{}");
  const criteria = parsed?.criteria || {};

  return {
    criteria: {
      fluencyCoherence: normalizeCriterionEvaluation(criteria?.fluencyCoherence),
      lexicalResource: normalizeCriterionEvaluation(criteria?.lexicalResource),
      grammaticalRange: normalizeCriterionEvaluation(criteria?.grammaticalRange),
      pronunciation: normalizeCriterionEvaluation(criteria?.pronunciation),
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

export function formatSpeakingFeedback(evaluation: SpeakingEvaluationModelJson): string {
  const lines: string[] = [];

  if (evaluation.overallFeedback) {
    lines.push("Overall feedback:");
    lines.push(evaluation.overallFeedback);
  }

  const addCriterion = (title: string, c: SpeakingCriterionEvaluation) => {
    lines.push("");
    lines.push(`${title}:`);
    if (c.feedback) lines.push(c.feedback);
    if (c.tips.length > 0) {
      lines.push("Tips:");
      for (const tip of c.tips) lines.push(`- ${tip}`);
    }
  };

  addCriterion("Fluency and Coherence", evaluation.criteria.fluencyCoherence);
  addCriterion("Lexical Resource", evaluation.criteria.lexicalResource);
  addCriterion("Grammatical Range and Accuracy", evaluation.criteria.grammaticalRange);
  addCriterion("Pronunciation", evaluation.criteria.pronunciation);

  return lines.join("\n");
}

export async function evaluateSpeakingWithRubric(input: {
  partNumber: SpeakingPartNumber;
  prompt: string;
  transcript: string;
}): Promise<SpeakingEvaluationModelJson> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SPEAKING_EVALUATION_SYSTEM },
      {
        role: "user",
        content: JSON.stringify(
          {
            partNumber: input.partNumber,
            prompt: input.prompt,
            transcript: input.transcript,
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
  return parseSpeakingEvaluationJson(raw);
}

