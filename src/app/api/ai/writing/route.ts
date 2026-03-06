import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import { evaluateWriting } from "@/lib/aiEvaluation";

// POST /api/ai/writing
// Body: { attemptId, answerId, task: "task1"|"task2", prompt, essay }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { attemptId, answerId, task, prompt, essay } = await req.json();

    if (!attemptId || !answerId || !task || !prompt || !essay) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const attempt = await Attempt.findOne({ _id: attemptId, userId: session.user.id });
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    // Run OpenAI evaluation
    const evaluation = await evaluateWriting(task, prompt, essay);

    // Save evaluation to the Answer document
    const updatedAnswer = await Answer.findByIdAndUpdate(
      answerId,
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

    return NextResponse.json({
      evaluation,
      answer: updatedAnswer,
    });
  } catch (error: any) {
    console.error("Writing AI evaluation error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
