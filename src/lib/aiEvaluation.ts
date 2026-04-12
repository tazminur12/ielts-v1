import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WritingEvaluationResult {
  bandScore: number;
  taskAchievementScore: number;
  coherenceScore: number;
  vocabularyScore: number;
  grammarScore: number;
  feedback: string;
  suggestions: string[];
  wordCount: number;
}

export interface SpeakingEvaluationResult {
  bandScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  vocabularyScore: number;
  grammarScore: number;
  feedback: string;
  suggestions: string[];
  transcribedText: string;
}

/**
 * Evaluate IELTS Writing Task using OpenAI
 */
export async function evaluateWriting(
  task: "task1" | "task2",
  prompt: string,
  essay: string
): Promise<WritingEvaluationResult> {
  const wordCount = essay.trim().split(/\s+/).length;

  const systemPrompt = `You are an expert IELTS examiner with 15+ years of experience. 
Evaluate the following IELTS Writing ${task === "task1" ? "Task 1" : "Task 2"} response strictly according to official IELTS band descriptors.
Provide your evaluation as a valid JSON object only.`;

  const userPrompt = `Task Prompt: ${prompt}

Student's Response:
${essay}

Evaluate and return ONLY a JSON object with this exact structure:
{
  "bandScore": <number 1-9, can use 0.5 increments>,
  "taskAchievementScore": <number 1-9>,
  "coherenceScore": <number 1-9>,
  "vocabularyScore": <number 1-9>,
  "grammarScore": <number 1-9>,
  "feedback": "<overall feedback in 2-3 sentences>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content || "{}";
  const result = JSON.parse(raw);

  return {
    bandScore: Number(result.bandScore) || 5,
    taskAchievementScore: Number(result.taskAchievementScore) || 5,
    coherenceScore: Number(result.coherenceScore) || 5,
    vocabularyScore: Number(result.vocabularyScore) || 5,
    grammarScore: Number(result.grammarScore) || 5,
    feedback: result.feedback || "No feedback available.",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    wordCount,
  };
}

/**
 * Transcribe audio using OpenAI Whisper
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  const file = new File([arrayBuffer], "recording.webm", { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
  });

  return transcription.text;
}

/**
 * Evaluate IELTS Speaking using OpenAI
 */
export async function evaluateSpeaking(
  prompt: string,
  transcribedText: string
): Promise<SpeakingEvaluationResult> {
  const systemPrompt = `You are an expert IELTS examiner specializing in the Speaking module.
Evaluate the transcribed speaking response strictly according to official IELTS Speaking band descriptors.
Provide your evaluation as a valid JSON object only.`;

  const userPrompt = `Speaking Prompt: ${prompt}

Transcribed Response:
${transcribedText}

Evaluate and return ONLY a JSON object with this exact structure:
{
  "bandScore": <number 1-9, can use 0.5 increments>,
  "fluencyScore": <number 1-9>,
  "pronunciationScore": <number 1-9>,
  "vocabularyScore": <number 1-9>,
  "grammarScore": <number 1-9>,
  "feedback": "<overall feedback in 2-3 sentences>",
  "suggestions": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content || "{}";
  const result = JSON.parse(raw);

  return {
    bandScore: Number(result.bandScore) || 5,
    fluencyScore: Number(result.fluencyScore) || 5,
    pronunciationScore: Number(result.pronunciationScore) || 5,
    vocabularyScore: Number(result.vocabularyScore) || 5,
    grammarScore: Number(result.grammarScore) || 5,
    feedback: result.feedback || "No feedback available.",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    transcribedText,
  };
}

/**
 * Convert IELTS raw score (0-40) to band score
 * Based on official IELTS conversion tables
 */
export function rawScoreToBand(rawScore: number, module: "listening" | "reading", totalQuestions: number = 40): number {
  // Scale the score to 40 so that short practice tests can still receive an accurate proportional band score.
  let scaledScore = rawScore;
  if (totalQuestions > 0 && totalQuestions !== 40) {
    scaledScore = Math.round((rawScore / totalQuestions) * 40);
  }

  if (module === "listening") {
    if (scaledScore >= 39) return 9;
    if (scaledScore >= 37) return 8.5;
    if (scaledScore >= 35) return 8;
    if (scaledScore >= 32) return 7.5;
    if (scaledScore >= 30) return 7;
    if (scaledScore >= 26) return 6.5;
    if (scaledScore >= 23) return 6;
    if (scaledScore >= 18) return 5.5;
    if (scaledScore >= 16) return 5;
    if (scaledScore >= 13) return 4.5;
    if (scaledScore >= 10) return 4;
    if (scaledScore >= 8)  return 3.5;
    if (scaledScore >= 6)  return 3;
    if (scaledScore >= 4)  return 2.5;
    return 2;
  } else {
    // Reading (Academic)
    if (scaledScore >= 39) return 9;
    if (scaledScore >= 37) return 8.5;
    if (scaledScore >= 35) return 8;
    if (scaledScore >= 33) return 7.5;
    if (scaledScore >= 30) return 7;
    if (scaledScore >= 27) return 6.5;
    if (scaledScore >= 23) return 6;
    if (scaledScore >= 19) return 5.5;
    if (scaledScore >= 15) return 5;
    if (scaledScore >= 13) return 4.5;
    if (scaledScore >= 10) return 4;
    if (scaledScore >= 8)  return 3.5;
    if (scaledScore >= 6)  return 3;
    if (scaledScore >= 4)  return 2.5;
    return 2;
  }
}

/**
 * Calculate overall IELTS band from individual module bands
 * Rounds to nearest 0.5
 */
export function calculateOverallBand(bands: {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}): number {
  const values = Object.values(bands).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 2) / 2; // Round to nearest 0.5
}
