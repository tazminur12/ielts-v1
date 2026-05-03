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
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

async function fetchAudioAsBuffer(audioUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(audioUrl);
  if (!res.ok) {
    throw new Error("Failed to fetch audio");
  }
  const mimeType = res.headers.get("content-type") || "audio/webm";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
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

    if (!attemptId || !audioUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, userId: session.user.id }).lean();
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    const answer =
      (answerId
        ? await Answer.findOne({ _id: answerId, attemptId, userId: session.user.id })
        : await Answer.findOne({ attemptId, userId: session.user.id, audioUrl })) ||
      null;

    if (!answer) {
      return NextResponse.json({ message: "Answer not found for audioUrl" }, { status: 404 });
    }

    const question = await Question.findById(answer.questionId).lean();
    if (!question) return NextResponse.json({ message: "Question not found" }, { status: 404 });

    const section = await Section.findById((question as any).sectionId).lean();
    const inferredPart = Number((section as any)?.order || 1);
    const partNumber = (inferredPart === 2 ? 2 : inferredPart === 3 ? 3 : 1) as 1 | 2 | 3;

    const prompt =
      (question as any).speakingPrompt ||
      (question as any).questionText ||
      "Answer the examiner's question.";

    const { buffer, mimeType } = await fetchAudioAsBuffer(audioUrl);
    const transcribedText = await transcribeAudio(buffer, mimeType);

    const evaluationJson = await evaluateSpeakingWithRubric({
      partNumber,
      prompt,
      transcript: transcribedText,
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
    const suggestions = uniqueSuggestions([
      ...evaluationJson.overallSuggestions,
      ...evaluationJson.criteria.fluencyCoherence.tips,
      ...evaluationJson.criteria.lexicalResource.tips,
      ...evaluationJson.criteria.grammaticalRange.tips,
      ...evaluationJson.criteria.pronunciation.tips,
    ]);

    await Answer.findByIdAndUpdate(answer._id, {
      $set: {
        audioUrl,
        transcribedText,
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
