import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Section from "@/models/Section";
import Question from "@/models/Question";
import {
  calculateOverallWritingBand,
  evaluateWritingWithRubric,
  formatWritingFeedback,
  uniqueSuggestions,
} from "@/lib/writingEvaluation";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await rateLimitOrThrow(session.user.id, "ai_writing");

    await connectDB();

    const body = await req.json();
    const attemptId = body?.attemptId;
    const taskType = body?.taskType as "task1" | "task2" | undefined;
    const userResponse = body?.userResponse;

    if (!attemptId || !taskType || typeof userResponse !== "string") {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (taskType !== "task1" && taskType !== "task2") {
      return NextResponse.json({ message: "Invalid taskType" }, { status: 400 });
    }

    const trimmed = userResponse.trim();
    if (!trimmed) {
      return NextResponse.json({ message: "userResponse is empty" }, { status: 400 });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, userId: session.user.id }).lean();
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    const sectionOrder = taskType === "task1" ? 1 : 2;

    const section = await Section.findOne({
      testId: attempt.testId,
      sectionType: "writing_task",
      order: sectionOrder,
    }).lean();

    const question =
      (section &&
        (await Question.findOne({
          testId: attempt.testId,
          sectionId: (section as any)._id,
          questionType: "essay",
        }).lean())) ||
      (await Question.findOne({ testId: attempt.testId, questionType: "essay" })
        .sort({ questionNumber: 1 })
        .lean());

    if (!question) {
      return NextResponse.json({ message: "Writing question not found" }, { status: 404 });
    }

    const upserted = await Answer.findOneAndUpdate(
      { attemptId, questionId: (question as any)._id },
      {
        $set: {
          attemptId,
          testId: attempt.testId,
          questionId: (question as any)._id,
          questionNumber: (question as any).questionNumber,
          questionType: (question as any).questionType,
          textAnswer: trimmed,
          userId: session.user.id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const prompt = (section as any)?.instructions || (question as any)?.questionText || "";

    const evaluationJson = await evaluateWritingWithRubric({
      taskType,
      prompt,
      userResponse: trimmed,
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
    const suggestions = uniqueSuggestions([
      ...evaluationJson.overallSuggestions,
      ...evaluationJson.criteria.taskAchievement.tips,
      ...evaluationJson.criteria.coherenceCohesion.tips,
      ...evaluationJson.criteria.lexicalResource.tips,
      ...evaluationJson.criteria.grammaticalRange.tips,
    ]);

    await Answer.findByIdAndUpdate(
      upserted._id,
      {
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
          aiEvaluation: {
            bandScore: overallBand,
            grammarScore: grammaticalRange,
            vocabularyScore: lexicalResource,
            coherenceScore: coherenceCohesion,
            taskAchievementScore: taskAchievement,
            feedback,
            suggestions,
            evaluatedAt: new Date(),
          },
          marksAwarded: overallBand,
        },
      },
      { new: true }
    );

    return withCacheHeaders(
      NextResponse.json({
        criteria: {
          taskAchievement,
          coherenceCohesion,
          lexicalResource,
          grammaticalRange,
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
    log.error({ error }, "writing_evaluation_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/writing/evaluate" });
    return NextResponse.json({ message: error?.message || "Server error" }, { status: 500 });
  }
}
