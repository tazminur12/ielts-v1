import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import { rawScoreToBand } from "@/lib/aiEvaluation";
import { getGuestId } from "@/lib/guestSession";

// GET /api/attempts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: id, userId: session.user.id } : { _id: id, guestId }
    )
      .populate("testId", "title module examType duration totalQuestions accessLevel")
      .lean();

    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const answers = await Answer.find(
      session?.user?.id ? { attemptId: id, userId: session.user.id } : { attemptId: id, guestId }
    ).lean();
    return NextResponse.json({ attempt, answers });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/attempts/[id]/submit  — handled via PATCH with action:"submit"
// PATCH /api/attempts/[id]  — submit attempt & calculate score
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: id, userId: session.user.id } : { _id: id, guestId }
    );
    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (body.action === "submit") {
      if (attempt.status === "submitted") {
        return NextResponse.json({ message: "Already submitted" }, { status: 400 });
      }

      const now = new Date();
      const timeSpent = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

      // Fetch all answers for this attempt
      const answers = await Answer.find(
        session?.user?.id ? { attemptId: id, userId: session.user.id } : { attemptId: id, guestId }
      );

      // For objective modules (listening/reading), auto-calculate score
      const isObjective = ["listening", "reading"].includes(attempt.module);

      if (isObjective) {
        // Fetch correct answers for all questions in this test
        const questions = await Question.find({ testId: attempt.testId })
          .select("+correctAnswer")
          .lean();

        const answerMap = new Map(answers.map((a) => [a.questionId.toString(), a]));
        let rawScore = 0;

        // Grade each answer
        for (const q of questions) {
          const ans = answerMap.get(q._id.toString());
          if (!ans) continue;

          const correctAnswer = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map((c: string) => c.toLowerCase().trim())
            : [String(q.correctAnswer || "").toLowerCase().trim()];

          let studentAnswer = "";
          if (ans.selectedOption) studentAnswer = ans.selectedOption.toLowerCase().trim();
          else if (ans.textAnswer) studentAnswer = ans.textAnswer.toLowerCase().trim();
          else if (ans.matchedAnswer) studentAnswer = ans.matchedAnswer.toLowerCase().trim();
          else if (ans.booleanAnswer) studentAnswer = ans.booleanAnswer.toLowerCase().trim();

          const isCorrect = correctAnswer.includes(studentAnswer);
          const marks = isCorrect ? (q.marks || 1) : 0;

          await Answer.findByIdAndUpdate(ans._id, {
            isCorrect,
            marksAwarded: marks,
            correctAnswer: q.correctAnswer, // reveal correct answer after submit
          });

          if (isCorrect) rawScore += marks;
        }

        const attemptModule = attempt.module as "listening" | "reading";
        const bandScore = rawScoreToBand(rawScore, attemptModule, questions.length);
        const percentageScore = Math.round((rawScore / questions.length) * 100);

        await attempt.updateOne({
          status: "evaluated",
          submittedAt: now,
          timeSpent,
          rawScore,
          percentageScore,
          bandScore,
          overallBand: bandScore,
        });
      } else {
        // Writing / Speaking — submitted, awaiting AI evaluation
        await attempt.updateOne({
          status: "submitted",
          submittedAt: now,
          timeSpent,
        });
      }

      const updated = await Attempt.findById(id)
        .populate("testId", "title module examType")
        .lean();

      return NextResponse.json(updated);
    }

    // Generic update (e.g., saving progress)
    const updated = await Attempt.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
