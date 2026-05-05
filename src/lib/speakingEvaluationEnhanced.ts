/**
 * ENHANCED Speaking Evaluation with Real Audio Analysis
 * 
 * This replaces the text-only evaluation system with actual audio metrics
 * Integrates Web Audio API analysis with OpenAI evaluation
 */

import OpenAI from "openai";
import { AudioAnalyzer } from "@/lib/audioAnalysis";

// ─── Updated System Prompt (Now includes audio metrics) ──────────────────

export const SPEAKING_EVALUATION_SYSTEM = `You are an expert IELTS Speaking examiner with 10+ years of experience (British Council / IDP standards).

You will be given:
- The speaking part number (1, 2, or 3)
- The prompt/question/cue card
- A transcript of the candidate's spoken response
- ACTUAL AUDIO ANALYSIS METRICS (new):
  * Pronunciation clarity score (0-10)
  * Hesitation rate and filler words detected
  * Speaking rate (words per minute)
  * Audio quality assessment
  * Signal-to-noise ratio

Evaluate strictly using IELTS Speaking band descriptors. Do not inflate scores. Be constructive but honest.

IMPORTANT: You now have REAL audio data, not just text estimates!
- Use the pronunciation clarity score to inform your pronunciation band (not just text)
- Consider hesitation rate when scoring fluency
- Use audio quality when assessing overall impression
- Reference specific audio metrics in your feedback

Return ONLY valid JSON. No markdown. No extra text. No code fences.

Your JSON MUST match this shape exactly:
{
  "criteria": {
    "fluencyCoherence": { "score": number, "feedback": string, "tips": string[] },
    "lexicalResource": { "score": number, "feedback": string, "tips": string[] },
    "grammaticalRange": { "score": number, "feedback": string, "tips": string[] },
    "pronunciation": { "score": number, "feedback": string, "tips": string[] }
  },
  "audioMetrics": {
    "clarityScore": number,
    "hesitationRate": number,
    "speakingRate": number,
    "audioQuality": number
  },
  "overallFeedback": string,
  "overallSuggestions": string[]
}

Rules:
- All criterion scores must be between 0 and 9 (0.5 increments allowed).
- Pronunciation score should be heavily influenced by the audio clarity metrics provided
- Each "tips" must have 2-3 actionable items.
- "overallFeedback" should be 3-6 sentences, referencing what the candidate actually said AND audio quality
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

export interface AudioMetricsInEvaluation {
  clarityScore: number; // 0-10
  hesitationRate: number; // per minute
  speakingRate: number; // words per minute
  audioQuality: number; // 0-100
}

export interface SpeakingEvaluationModelJson {
  criteria: Record<SpeakingCriterionKey, SpeakingCriterionEvaluation>;
  audioMetrics?: AudioMetricsInEvaluation;
  overallFeedback: string;
  overallSuggestions: string[];
}

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openai) return openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set the environment variable to enable AI evaluation."
    );
  }
  openai = new OpenAI({ apiKey });
  return openai;
}

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
    audioMetrics: parsed?.audioMetrics,
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
    lines.push(`${title}: ${c.score}/9`);
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

  if (evaluation.audioMetrics) {
    lines.push("");
    lines.push("Audio Metrics:");
    lines.push(`- Clarity: ${evaluation.audioMetrics.clarityScore}/10`);
    lines.push(`- Hesitation Rate: ${evaluation.audioMetrics.hesitationRate.toFixed(1)}/min`);
    lines.push(`- Speaking Rate: ${evaluation.audioMetrics.speakingRate} WPM`);
    lines.push(`- Audio Quality: ${evaluation.audioMetrics.audioQuality}/100`);
  }

  if (evaluation.overallSuggestions.length > 0) {
    lines.push("");
    lines.push("Suggestions for improvement:");
    for (const sugg of evaluation.overallSuggestions) lines.push(`- ${sugg}`);
  }

  return lines.join("\n");
}

// ─── NEW: Extract audio metrics for evaluation ──────────────────────────

export async function extractAudioMetricsForEvaluation(
  audioBlob: Blob
): Promise<AudioMetricsInEvaluation | null> {
  try {
    const analyzer = new AudioAnalyzer();
    const features = await analyzer.analyzeAudioBlob(audioBlob);

    return {
      clarityScore: features.clarityScore,
      hesitationRate: features.hesitationAnalysis.ratePerMinute,
      speakingRate: features.speechRate.estimatedWordsPerMinute,
      audioQuality: features.audioQualityScore,
    };
  } catch (error) {
    console.error("Failed to extract audio metrics:", error);
    return null;
  }
}

// ─── ENHANCED: Evaluate speaking with audio analysis ──────────────────────

/**
 * Evaluate IELTS Speaking using:
 * 1. Transcript text
 * 2. Audio file (new!)
 * 3. Speaking part number
 * 4. Original prompt/question
 */
export async function evaluateSpeakingEnhanced(
  prompt: string,
  transcribedText: string,
  audioBlob: Blob | null, // NEW: actual audio file
  partNumber?: 1 | 2 | 3
): Promise<SpeakingEvaluationModelJson> {
  const audioMetrics = audioBlob ? await extractAudioMetricsForEvaluation(audioBlob) : null;

  const userPrompt = `Speaking Part: ${partNumber || "Unknown"}

Speaking Prompt/Question:
${prompt}

Candidate's Response:
${transcribedText}

${
  audioMetrics
    ? `Audio Analysis Results:
- Pronunciation Clarity: ${audioMetrics.clarityScore}/10
- Hesitation Rate: ${audioMetrics.hesitationRate.toFixed(1)} per minute
- Speaking Rate: ${audioMetrics.speakingRate} words per minute
- Overall Audio Quality: ${audioMetrics.audioQuality}/100

Use these audio metrics to inform your pronunciation and fluency scores.`
    : "Note: Audio metrics not available - evaluate from text only"
}

Evaluate and return ONLY a JSON object with this exact structure:
{
  "criteria": {
    "fluencyCoherence": { "score": <0-9>, "feedback": "...", "tips": ["...", "..."] },
    "lexicalResource": { "score": <0-9>, "feedback": "...", "tips": ["...", "..."] },
    "grammaticalRange": { "score": <0-9>, "feedback": "...", "tips": ["...", "..."] },
    "pronunciation": { "score": <0-9>, "feedback": "...", "tips": ["...", "..."] }
  },
  "audioMetrics": ${JSON.stringify(audioMetrics)},
  "overallFeedback": "...",
  "overallSuggestions": ["...", "..."]
}`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: SPEAKING_EVALUATION_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const evaluation = parseSpeakingEvaluationJson(content);

    if (audioMetrics) {
      evaluation.audioMetrics = audioMetrics;
    }

    return evaluation;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

// ─── BACKWARD COMPATIBILITY: Old function still works ──────────────────

/**
 * Original evaluation function (text-only, for backward compatibility)
 * Still works but less accurate
 */
export async function evaluateSpeaking(
  prompt: string,
  transcribedText: string
): Promise<SpeakingEvaluationModelJson> {
  // Call enhanced version without audio
  return evaluateSpeakingEnhanced(prompt, transcribedText, null);
}

// ─── NEW: Pronunciation-specific evaluation ──────────────────────────────

/**
 * Deep evaluation of pronunciation using audio metrics
 */
export async function evaluatePronunciation(
  audioBlob: Blob,
  _transcribedText: string
): Promise<{
  score: number; // 0-9
  feedback: string;
  clarity: number; // 0-10
  snr: number; // dB
  recommendations: string[];
}> {
  const analyzer = new AudioAnalyzer();
  const features = await analyzer.analyzeAudioBlob(audioBlob);

  let score = 5; // Default

  // Calculate pronunciation score based on audio metrics
  if (features.clarityScore >= 8) {
    score = 8;
  } else if (features.clarityScore >= 7) {
    score = 7;
  } else if (features.clarityScore >= 6) {
    score = 6;
  } else if (features.clarityScore >= 5) {
    score = 5;
  } else if (features.clarityScore >= 3) {
    score = 3;
  } else {
    score = 2;
  }

  // Adjust based on audio quality
  if (features.audioQualityScore < 40) {
    score = Math.max(1, score - 1);
  }

  const feedback =
    features.clarityScore >= 7
      ? "Your pronunciation is clear and easy to understand."
      : features.clarityScore >= 5
        ? "Your pronunciation is generally understandable but could be clearer."
        : "Your pronunciation needs significant improvement. Focus on articulation.";

  return {
    score: roundToNearestHalf(score),
    feedback,
    clarity: features.clarityScore,
    snr: features.signalToNoiseRatio,
    recommendations: features.microphoneQuality.recommendations,
  };
}

// ─── Type exports ──────────────────────────────────────────────────────

export type { AudioFeatures } from "@/lib/audioAnalysis";
