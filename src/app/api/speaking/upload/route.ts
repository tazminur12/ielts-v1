import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import { uploadToS3 } from "@/lib/s3Upload";
import { getGuestId } from "@/lib/guestSession";
import { getSpeakingAnalysisQueue } from "@/lib/bullmq";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const formData = await req.formData();
    const attemptId = formData.get("attemptId") as string;
    const partNumber = formData.get("partNumber") as string;
    const questionId = formData.get("questionId") as string;
    const audioFile = formData.get("audio") as File | null;

    if (!attemptId || !partNumber || !questionId || !audioFile) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      ...(session?.user?.id ? { userId: session.user.id } : { guestId: guestId! }),
    }).lean();
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    const question = await Question.findById(questionId).lean();
    if (!question) return NextResponse.json({ message: "Question not found" }, { status: 404 });

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const uploaded = await uploadToS3(buffer, audioFile.name, audioFile.type, "tests/speaking");

    const answer = await Answer.findOneAndUpdate(
      { attemptId, questionId },
      {
        $set: {
          attemptId,
          testId: attempt.testId,
          questionId,
          questionNumber: (question as any).questionNumber,
          questionType: (question as any).questionType,
          questionText: String((question as any).speakingPrompt || (question as any).questionText || "").trim(),
          audioUrl: uploaded.url,
          ...(session?.user?.id ? { userId: session.user.id } : { guestId: guestId! }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ✅ Queue audio analysis for background processing
    // This allows upload response to return immediately without blocking on analysis
    const analysisQueue = getSpeakingAnalysisQueue();
    if (analysisQueue) {
      await analysisQueue.add('analyze-audio', {
        answerId: String(answer._id),
        audioUrl: uploaded.url,
        questionId,
      }, {
        // Lower priority: analysis is not blocking
        priority: 1,
        delay: 500, // Wait for user to move to next question
      });
    }

    return NextResponse.json({
      audioUrl: uploaded.url,
      answerId: answer._id,
    });
  } catch (error: any) {
    console.error("Speaking upload error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
