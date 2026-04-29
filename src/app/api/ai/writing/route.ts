import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import { evaluateWriting } from "@/lib/aiEvaluation";
// Ensure Question model is loaded
import Question from "@/models/Question";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";

// POST /api/ai/writing
// Body: { attemptId, questionId }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await rateLimitOrThrow(session.user.id, "ai_writing");
    
    await connectDB();

    const { attemptId, questionId } = await req.json();
    
    if (!attemptId || !questionId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const attempt = await Attempt.findOne({ _id: attemptId, userId: session.user.id });
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });
    
    // Find Answer
    const answer = await Answer.findOne({ attemptId, questionId });
    if (!answer || !answer.textAnswer) {
      return NextResponse.json({ message: "No text answer found to evaluate" }, { status: 400 });
    }

    // Find Question to get prompt and task
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ message: "Question not found" }, { status: 404 });
    }

    // Attempt to guess task and prompt
    const task = (question as any).taskType || "task2";
    const prompt = (question as any).instruction || (question as any).text || "Write an essay";
    const essay = answer.textAnswer;

    // Run OpenAI evaluation
    const evaluation = await evaluateWriting(task, prompt, essay);

    // Save evaluation to the Answer document
    const updatedAnswer = await Answer.findByIdAndUpdate(
      answer._id,
      {
        $set: {
          aiEvaluation: {
            bandScore: evaluation.bandScore,
            grammarScore: evaluation.grammarScore,
            vocabularyScore: evaluation.vocabularyScore,
            coherenceScore: evaluation.coherenceScore,
            taskAchievementScore: evaluation.taskAchievementScore,
            feedback: evaluation.feedback,
            suggestions: evaluation.suggestions,
            evaluatedAt: new Date(),
          },
          marksAwarded: evaluation.bandScore,
        },
      },
      { new: true }
    );

    // Update attempt-level AI evaluation summary
    await Attempt.findByIdAndUpdate(attemptId, {
      $set: {
        "aiEvaluation.grammarScore": evaluation.grammarScore,
        "aiEvaluation.vocabularyScore": evaluation.vocabularyScore,
        "aiEvaluation.coherenceScore": evaluation.coherenceScore,
        "aiEvaluation.taskAchievementScore": evaluation.taskAchievementScore,
        "aiEvaluation.feedback": evaluation.feedback,
        "aiEvaluation.suggestions": evaluation.suggestions,
        bandScore: evaluation.bandScore,
        overallBand: evaluation.bandScore,
        status: "evaluated",
      },
    });

    return withCacheHeaders(
      NextResponse.json({
        evaluation,
        answer: updatedAnswer,
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
    console.error("Writing AI evaluation error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
