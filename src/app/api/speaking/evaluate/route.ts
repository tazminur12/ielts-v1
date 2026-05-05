import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import Section from "@/models/Section";
import { transcribeAudio } from "@/lib/aiEvaluation";
import {
  calculateOverallSpeakingBand,
  evaluateSpeakingWithRubric,
  formatSpeakingFeedback,
  uniqueSuggestions,
} from "@/lib/speakingEvaluation";
import { useFeature as consumeFeature } from "@/lib/accessControl";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

const OPENAI_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

function buildDefaultSpeakingEvaluation(transcript: string, reason?: string) {
  const baseFeedback = "The response was too brief for a complete evaluation.";
  const reasonSuffix = reason ? ` ${reason}` : "";
  return {
    speakingEvaluation: {
      transcript,
      fluencyCoherence: {
        bandScore: 3,
        feedback: "Response was too brief to evaluate fully.",
        tips: ["Speak for the full allocated time", "Develop your answers with examples"],
      },
      lexicalResource: {
        bandScore: 3,
        feedback: "Limited vocabulary demonstrated due to short response.",
        tips: ["Use a wider range of vocabulary", "Avoid repetition"],
      },
      grammaticalRange: {
        bandScore: 3,
        feedback: "Insufficient response to assess grammar range.",
        tips: ["Use complex sentence structures", "Practice speaking in full sentences"],
      },
      pronunciation: {
        bandScore: 4,
        feedback: "Unable to fully assess pronunciation from short response.",
        tips: ["Speak clearly and at a natural pace", "Practice stress and intonation patterns"],
      },
      overallBand: 3,
      generalFeedback: `${baseFeedback}${reasonSuffix}`.trim(),
      strengths: ["Attempted the question"],
      weaknesses: ["Response length was insufficient", "More detail required"],
      evaluatedAt: new Date(),
      evaluatedBy: "ai" as const,
    },
    aiEvaluation: {
      bandScore: 3,
      fluencyScore: 3,
      pronunciationScore: 4,
      coherenceScore: 3,
      vocabularyScore: 3,
      grammarScore: 3,
      feedback: `${baseFeedback}${reasonSuffix}`.trim(),
      suggestions: [
        "Speak for the full allocated time",
        "Develop your answers with examples",
        "Use a wider range of vocabulary",
      ],
      evaluatedAt: new Date(),
    },
  };
}

async function fetchAudioAsBuffer(audioUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(audioUrl);
  if (!res.ok) {
    throw new Error("Failed to fetch audio");
  }
  const mimeType = res.headers.get("content-type") || "audio/webm";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

export async function GET(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await rateLimitOrThrow(session.user.id, "ai_speaking");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get("attemptId") || undefined;
    const questionId = searchParams.get("questionId") || undefined;

    if (!attemptId || !questionId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await Answer.findOne({
      attemptId,
      questionId,
      "speakingEvaluation.overallBand": { $exists: true },
    }).lean();

    if (existing?.speakingEvaluation) {
      return withCacheHeaders(
        NextResponse.json({ speakingEvaluation: existing.speakingEvaluation }),
        { kind: "no-store" }
      );
    }

    return withCacheHeaders(NextResponse.json({ status: "pending" }), { kind: "no-store" });
  } catch (error: any) {
    log.error({ error }, "speaking_evaluation_get_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/speaking/evaluate" });
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await rateLimitOrThrow(session.user.id, "ai_speaking");

    await connectDB();

    const body = await req.json();
    const attemptId = body?.attemptId as string | undefined;
    const audioUrl = body?.audioUrl as string | undefined;
    const answerId = body?.answerId as string | undefined;
    const questionId = body?.questionId as string | undefined;

    if (!attemptId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const [attempt, answer] = await Promise.all([
      Attempt.findOne({ _id: attemptId, userId: session.user.id }).lean(),
      (answerId
        ? Answer.findOne({ _id: answerId, attemptId, userId: session.user.id })
        : questionId
        ? Answer.findOne({ attemptId, userId: session.user.id, questionId })
        : Answer.findOne({ attemptId, userId: session.user.id, audioUrl })) || null,
    ]);

    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    if (!answer) {
      return NextResponse.json({ message: "Answer not found for audioUrl" }, { status: 404 });
    }

    const resolvedAudioUrl = audioUrl || (answer as any)?.audioUrl;
    if (!resolvedAudioUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await Answer.findOne({
      attemptId,
      questionId: answer.questionId,
      "speakingEvaluation.overallBand": { $exists: true },
    }).lean();
    if (existing?.speakingEvaluation) {
      return withCacheHeaders(
        NextResponse.json({ speakingEvaluation: existing.speakingEvaluation }),
        { kind: "no-store" }
      );
    }

    await consumeFeature(session.user.id, "speakingEvaluation");

    const question = await Question.findById(answer.questionId).lean();
    if (!question) return NextResponse.json({ message: "Question not found" }, { status: 404 });

    const section = await Section.findById((question as any).sectionId).lean();
    const inferredPart = Number((section as any)?.order || 1);
    const partNumber = (inferredPart === 2 ? 2 : inferredPart === 3 ? 3 : 1) as 1 | 2 | 3;

    const prompt =
      (question as any).speakingPrompt ||
      (question as any).questionText ||
      "Answer the examiner's question.";

  const { buffer, mimeType } = await fetchAudioAsBuffer(resolvedAudioUrl);
    let transcribedText = "";
    let transcriptionTimedOut = false;
    try {
      transcribedText = await withTimeout(
        transcribeAudio(buffer, mimeType),
        OPENAI_TIMEOUT_MS,
        "transcription"
      );
    } catch (err: any) {
      if (err?.message !== "transcription_timeout") {
        throw err;
      }
      transcriptionTimedOut = true;
    }

    const wordCount = transcribedText.trim().length > 0 ? transcribedText.trim().split(/\s+/).length : 0;
    if (wordCount < 10) {
      const { speakingEvaluation, aiEvaluation } = buildDefaultSpeakingEvaluation(
        transcribedText,
        transcriptionTimedOut ? "Transcription timed out; showing partial feedback." : undefined
      );

      await Answer.findByIdAndUpdate(answer._id, {
        $set: {
          audioUrl: resolvedAudioUrl,
          transcribedText,
          speakingEvaluation,
          aiEvaluation,
          marksAwarded: speakingEvaluation.overallBand,
        },
      });

      const [totalSpeaking, evaluatedAnswers] = await Promise.all([
        Question.countDocuments({ testId: attempt.testId, questionType: "speaking" }),
        Answer.find({
          attemptId,
          userId: session.user.id,
          questionType: "speaking",
          "aiEvaluation.bandScore": { $exists: true },
        }).lean(),
      ]);

      const nums = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
      const avg = (items: (number | undefined)[]) => {
        const vs = items.filter((v): v is number => typeof v === "number");
        if (vs.length === 0) return undefined;
        return Math.round(((vs.reduce((s, v) => s + v, 0) / vs.length) * 2)) / 2;
      };

      const attemptBand = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.bandScore)));
      const attemptGrammar = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.grammarScore)));
      const attemptVocab = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.vocabularyScore)));
      const attemptFluency = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.fluencyScore)));
      const attemptStatus = totalSpeaking > 0 && evaluatedAnswers.length >= totalSpeaking ? "evaluated" : "submitted";

      await Attempt.findByIdAndUpdate(attemptId, {
        $set: {
          status: attemptStatus,
          overallBand: attemptBand ?? speakingEvaluation.overallBand,
          bandScore: attemptBand ?? speakingEvaluation.overallBand,
          "sectionBands.speaking": attemptBand ?? speakingEvaluation.overallBand,
          "aiEvaluation.grammarScore": attemptGrammar,
          "aiEvaluation.vocabularyScore": attemptVocab,
          "aiEvaluation.coherenceScore": attemptFluency,
          "aiEvaluation.feedback": aiEvaluation.feedback,
          "aiEvaluation.suggestions": aiEvaluation.suggestions,
        },
      });

      return withCacheHeaders(
        NextResponse.json({ speakingEvaluation }),
        { kind: "no-store" }
      );
    }

    let evaluationJson;
    try {
      evaluationJson = await withTimeout(
        evaluateSpeakingWithRubric({ partNumber, prompt, transcript: transcribedText }),
        OPENAI_TIMEOUT_MS,
        "evaluation"
      );
    } catch (err: any) {
      if (err?.message !== "evaluation_timeout") {
        throw err;
      }

      const { speakingEvaluation, aiEvaluation } = buildDefaultSpeakingEvaluation(
        transcribedText,
        "Evaluation timed out; showing partial feedback."
      );

      await Answer.findByIdAndUpdate(answer._id, {
        $set: {
          audioUrl: resolvedAudioUrl,
          transcribedText,
          speakingEvaluation,
          aiEvaluation,
          marksAwarded: speakingEvaluation.overallBand,
        },
      });

      const [totalSpeaking, evaluatedAnswers] = await Promise.all([
        Question.countDocuments({ testId: attempt.testId, questionType: "speaking" }),
        Answer.find({
          attemptId,
          userId: session.user.id,
          questionType: "speaking",
          "aiEvaluation.bandScore": { $exists: true },
        }).lean(),
      ]);

      const nums = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
      const avg = (items: (number | undefined)[]) => {
        const vs = items.filter((v): v is number => typeof v === "number");
        if (vs.length === 0) return undefined;
        return Math.round(((vs.reduce((s, v) => s + v, 0) / vs.length) * 2)) / 2;
      };

      const attemptBand = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.bandScore)));
      const attemptGrammar = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.grammarScore)));
      const attemptVocab = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.vocabularyScore)));
      const attemptFluency = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.fluencyScore)));
      const attemptStatus = totalSpeaking > 0 && evaluatedAnswers.length >= totalSpeaking ? "evaluated" : "submitted";

      await Attempt.findByIdAndUpdate(attemptId, {
        $set: {
          status: attemptStatus,
          overallBand: attemptBand ?? speakingEvaluation.overallBand,
          bandScore: attemptBand ?? speakingEvaluation.overallBand,
          "sectionBands.speaking": attemptBand ?? speakingEvaluation.overallBand,
          "aiEvaluation.grammarScore": attemptGrammar,
          "aiEvaluation.vocabularyScore": attemptVocab,
          "aiEvaluation.coherenceScore": attemptFluency,
          "aiEvaluation.feedback": aiEvaluation.feedback,
          "aiEvaluation.suggestions": aiEvaluation.suggestions,
        },
      });

      return withCacheHeaders(
        NextResponse.json({ speakingEvaluation }),
        { kind: "no-store" }
      );
    }

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
    const suggestions = uniqueSuggestions([
      ...evaluationJson.overallSuggestions,
      ...evaluationJson.criteria.fluencyCoherence.tips,
      ...evaluationJson.criteria.lexicalResource.tips,
      ...evaluationJson.criteria.grammaticalRange.tips,
      ...evaluationJson.criteria.pronunciation.tips,
    ]);

    const speakingEvaluation = {
      transcript: transcribedText,
      fluencyCoherence: {
        bandScore: fluencyCoherence,
        feedback: evaluationJson.criteria.fluencyCoherence.feedback,
        tips: evaluationJson.criteria.fluencyCoherence.tips,
      },
      lexicalResource: {
        bandScore: lexicalResource,
        feedback: evaluationJson.criteria.lexicalResource.feedback,
        tips: evaluationJson.criteria.lexicalResource.tips,
      },
      grammaticalRange: {
        bandScore: grammaticalRange,
        feedback: evaluationJson.criteria.grammaticalRange.feedback,
        tips: evaluationJson.criteria.grammaticalRange.tips,
      },
      pronunciation: {
        bandScore: pronunciation,
        feedback: evaluationJson.criteria.pronunciation.feedback,
        tips: evaluationJson.criteria.pronunciation.tips,
      },
      overallBand,
      generalFeedback: evaluationJson.overallFeedback,
      strengths: [],
      weaknesses: [],
      evaluatedAt: new Date(),
      evaluatedBy: "ai" as const,
    };

    await Answer.findByIdAndUpdate(answer._id, {
      $set: {
  audioUrl: resolvedAudioUrl,
        transcribedText,
        speakingEvaluation,
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

    const [totalSpeaking, evaluatedAnswers] = await Promise.all([
      Question.countDocuments({ testId: attempt.testId, questionType: "speaking" }),
      Answer.find({
        attemptId,
        userId: session.user.id,
        questionType: "speaking",
        "aiEvaluation.bandScore": { $exists: true },
      }).lean(),
    ]);

    const nums = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
    const avg = (items: (number | undefined)[]) => {
      const vs = items.filter((v): v is number => typeof v === "number");
      if (vs.length === 0) return undefined;
      return Math.round(((vs.reduce((s, v) => s + v, 0) / vs.length) * 2)) / 2;
    };

    const attemptBand = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.bandScore)));
    const attemptGrammar = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.grammarScore)));
    const attemptVocab = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.vocabularyScore)));
    const attemptFluency = avg(evaluatedAnswers.map((a: any) => nums(a?.aiEvaluation?.fluencyScore)));
    const attemptStatus = totalSpeaking > 0 && evaluatedAnswers.length >= totalSpeaking ? "evaluated" : "submitted";

    await Attempt.findByIdAndUpdate(attemptId, {
      $set: {
        status: attemptStatus,
        overallBand: attemptBand ?? overallBand,
        bandScore: attemptBand ?? overallBand,
        "sectionBands.speaking": attemptBand ?? overallBand,
        "aiEvaluation.grammarScore": attemptGrammar,
        "aiEvaluation.vocabularyScore": attemptVocab,
        "aiEvaluation.coherenceScore": attemptFluency,
        "aiEvaluation.feedback": feedback,
        "aiEvaluation.suggestions": suggestions,
      },
    });

    return withCacheHeaders(
      NextResponse.json({
        speakingEvaluation,
        transcript: transcribedText,
        criteria: {
          fluencyCoherence,
          lexicalResource,
          grammaticalRange,
          pronunciation,
        },
        overallBand,
        feedback,
        suggestions,
      }),
      { kind: "no-store" }
    );
  } catch (error: any) {
    if (error?.message === "rate_limited") {
      const retryAfter = Number(error?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    log.error({ error }, "speaking_evaluation_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/speaking/evaluate" });
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
