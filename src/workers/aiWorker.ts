import "server-only";

import { Worker } from "bullmq";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import Question from "@/models/Question";
import Section from "@/models/Section";
import { getBullConnection } from "@/lib/bullmq";
import { calculateOverallBand, transcribeAudio } from "@/lib/aiEvaluation";
import { recordQueueFailure } from "@/lib/queueFailure";
import { startWorkerHeartbeat } from "@/lib/workerHeartbeat";
import {
  calculateOverallSpeakingBand,
  evaluateSpeakingWithRubric,
  formatSpeakingFeedback,
  uniqueSuggestions as uniqueSpeakingSuggestions,
} from "@/lib/speakingEvaluation";
import {
  calculateOverallWritingBand,
  evaluateWritingWithRubric,
  formatWritingFeedback,
  uniqueSuggestions as uniqueWritingSuggestions,
} from "@/lib/writingEvaluation";

async function fetchAudioAsBuffer(audioUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("Failed to fetch audio");
  const mimeType = res.headers.get("content-type") || "audio/webm";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

async function evaluateWritingAnswer(input: { answerId: string }) {
  const answer: any = await Answer.findById(input.answerId).lean();
  if (!answer) return { ok: false };
  if (answer.writingEvaluation?.evaluatedBy === "ai") return { ok: true, skipped: true };
  if (!answer.textAnswer || typeof answer.textAnswer !== "string") return { ok: false };

  const question: any = await Question.findById(answer.questionId).lean();
  if (!question) return { ok: false };
  const section: any = question.sectionId ? await Section.findById(question.sectionId).lean() : null;
  const taskType = (Number(section?.partNumber || section?.order) === 2 ? "task2" : "task1") as "task1" | "task2";
  const prompt = section?.instructions || question.questionText || "";

  const evaluationJson = await evaluateWritingWithRubric({
    taskType,
    prompt,
    userResponse: String(answer.textAnswer).trim(),
  });

  const taskAchievement = evaluationJson.criteria.taskAchievement.score;
  const coherenceCohesion = evaluationJson.criteria.coherenceCohesion.score;
  const lexicalResource = evaluationJson.criteria.lexicalResource.score;
  const grammaticalRange = evaluationJson.criteria.grammaticalRange.score;

  const overallBand = calculateOverallWritingBand([
    taskAchievement,
    coherenceCohesion,
    lexicalResource,
    grammaticalRange,
  ]);

  const feedback = formatWritingFeedback(evaluationJson);
  const suggestions = uniqueWritingSuggestions([
    ...evaluationJson.overallSuggestions,
    ...evaluationJson.criteria.taskAchievement.tips,
    ...evaluationJson.criteria.coherenceCohesion.tips,
    ...evaluationJson.criteria.lexicalResource.tips,
    ...evaluationJson.criteria.grammaticalRange.tips,
  ]);

  await Answer.findByIdAndUpdate(input.answerId, {
    $set: {
      writingEvaluation: {
        taskAchievement,
        coherenceCohesion,
        lexicalResource,
        grammaticalRange,
        overallBand,
        feedback,
        suggestions,
        evaluatedAt: new Date(),
        evaluatedBy: "ai",
      },
    },
  });

  return { ok: true, overallBand };
}

async function evaluateSpeakingAnswer(input: { answerId: string }) {
  const answer: any = await Answer.findById(input.answerId).lean();
  if (!answer) return { ok: false };
  if (typeof answer.aiEvaluation?.bandScore === "number") return { ok: true, skipped: true };
  if (!answer.audioUrl || typeof answer.audioUrl !== "string") return { ok: false };

  const question: any = await Question.findById(answer.questionId).lean();
  if (!question) return { ok: false };
  const section: any = question.sectionId ? await Section.findById(question.sectionId).lean() : null;
  const pn = Number(section?.partNumber || section?.order || 1);
  const partNumber = (pn === 2 ? 2 : pn === 3 ? 3 : 1) as 1 | 2 | 3;
  const prompt = question.speakingPrompt || question.questionText || "";

  const { buffer, mimeType } = await fetchAudioAsBuffer(answer.audioUrl);
  const transcript = await transcribeAudio(buffer, mimeType);

  const evaluationJson = await evaluateSpeakingWithRubric({
    partNumber,
    prompt,
    transcript,
  });

  const fluencyCoherence = evaluationJson.criteria.fluencyCoherence.score;
  const lexicalResource = evaluationJson.criteria.lexicalResource.score;
  const grammaticalRange = evaluationJson.criteria.grammaticalRange.score;
  const pronunciation = evaluationJson.criteria.pronunciation.score;

  const overallBand = calculateOverallSpeakingBand([
    fluencyCoherence,
    lexicalResource,
    grammaticalRange,
    pronunciation,
  ]);

  const feedback = formatSpeakingFeedback(evaluationJson);
  const suggestions = uniqueSpeakingSuggestions([
    ...evaluationJson.overallSuggestions,
    ...evaluationJson.criteria.fluencyCoherence.tips,
    ...evaluationJson.criteria.lexicalResource.tips,
    ...evaluationJson.criteria.grammaticalRange.tips,
    ...evaluationJson.criteria.pronunciation.tips,
  ]);

  await Answer.findByIdAndUpdate(input.answerId, {
    $set: {
      transcribedText: transcript,
      aiEvaluation: {
        bandScore: overallBand,
        fluencyScore: fluencyCoherence,
        pronunciationScore: pronunciation,
        coherenceScore: fluencyCoherence,
        vocabularyScore: lexicalResource,
        grammarScore: grammaticalRange,
        feedback,
        suggestions,
        evaluatedAt: new Date(),
      },
      marksAwarded: overallBand,
    },
  });

  return { ok: true, overallBand };
}

async function evaluateAttemptIfReady(attemptId: string) {
  const attempt: any = await Attempt.findById(attemptId).lean();
  if (!attempt) return;
  if (attempt.status !== "submitted") return;

  const answers: any[] = await Answer.find({ attemptId }).lean();
  const hasPendingWriting = answers.some((a) => a.questionType === "essay" && !a.writingEvaluation?.overallBand);
  const hasPendingSpeaking = answers.some((a) => a.questionType === "speaking" && !a.aiEvaluation?.bandScore);
  if (hasPendingWriting || hasPendingSpeaking) return;

  const essayAnswers = answers.filter((a) => a.questionType === "essay" && typeof a.writingEvaluation?.overallBand === "number");
  const speakingAnswers = answers.filter((a) => a.questionType === "speaking" && typeof a.aiEvaluation?.bandScore === "number");

  const essayQuestionIds = essayAnswers.map((a) => a.questionId);
  const essayQuestions: any[] =
    essayQuestionIds.length > 0
      ? await Question.find({ _id: { $in: essayQuestionIds } }).select("sectionId").lean()
      : [];
  const sectionIds = essayQuestions.map((q) => q.sectionId).filter(Boolean);
  const sections: any[] =
    sectionIds.length > 0
      ? await Section.find({ _id: { $in: sectionIds } }).select("_id partNumber order").lean()
      : [];
  const partBySectionId = new Map(sections.map((s) => [String(s._id), Number(s.partNumber || s.order || 1)]));
  const qSectionByQId = new Map(essayQuestions.map((q) => [String(q._id), String(q.sectionId)]));

  const task1Bands: number[] = [];
  const task2Bands: number[] = [];

  for (const a of essayAnswers) {
    const qId = String(a.questionId);
    const secId = qSectionByQId.get(qId);
    const pn = secId ? partBySectionId.get(String(secId)) : 1;
    const b = Number(a.writingEvaluation.overallBand);
    if (pn === 2) task2Bands.push(b);
    else task1Bands.push(b);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const roundHalf = (x: number) => Math.round(x * 2) / 2;

  const task1 = avg(task1Bands);
  const task2 = avg(task2Bands);
  const writingBand = task1 && task2 ? roundHalf((task1 + task2 * 2) / 3) : roundHalf(task2 || task1 || 0);

  const speakingBand = speakingAnswers.length
    ? roundHalf(avg(speakingAnswers.map((a) => Number(a.aiEvaluation.bandScore))))
    : 0;

  const listeningBand = Number(attempt.sectionBands?.listening || 0);
  const readingBand = Number(attempt.sectionBands?.reading || 0);

  const overallBand =
    listeningBand && readingBand && writingBand && speakingBand
      ? calculateOverallBand({
          listening: listeningBand,
          reading: readingBand,
          writing: writingBand,
          speaking: speakingBand,
        })
      : null;

  await Attempt.findByIdAndUpdate(attemptId, {
    $set: {
      status: "evaluated",
      sectionBands: {
        ...(attempt.sectionBands || {}),
        ...(writingBand ? { writing: writingBand } : {}),
        ...(speakingBand ? { speaking: speakingBand } : {}),
      },
      ...(overallBand ? { overallBand, bandScore: overallBand } : {}),
    },
  });
}

export function startAiWorker() {
  const connection = getBullConnection();
  if (!connection) {
    throw new Error("BULLMQ_REDIS_URL is missing");
  }

  const stopHeartbeat = startWorkerHeartbeat({
    connection,
    workerName: "ai",
  });

  const worker = new Worker(
    "ai",
    async (job: any) => {
      await connectDB();

      if (job.name === "writing_eval") {
        const { answerId, attemptId } = job.data as { answerId: string; attemptId: string };
        const r = await evaluateWritingAnswer({ answerId });
        if (attemptId) await evaluateAttemptIfReady(attemptId);
        return r;
      }

      if (job.name === "speaking_eval") {
        const { answerId, attemptId } = job.data as { answerId: string; attemptId: string };
        const r = await evaluateSpeakingAnswer({ answerId });
        if (attemptId) await evaluateAttemptIfReady(attemptId);
        return r;
      }

      return null;
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", async (job: any, err: any) => {
    if (!job) return;
    await recordQueueFailure({
      queue: "ai",
      jobId: String(job.id),
      name: String(job.name),
      data: job.data,
      failedReason: err?.message || job.failedReason,
      stacktrace: Array.isArray(job.stacktrace) ? job.stacktrace : [],
      attemptsMade: job.attemptsMade,
    });
  });

  worker.on("closed", () => stopHeartbeat());

  return worker;
}
