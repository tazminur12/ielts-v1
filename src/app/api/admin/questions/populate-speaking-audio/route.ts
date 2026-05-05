import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Question from "@/models/Question";
import User from "@/models/User";

// POST /api/admin/questions/populate-speaking-audio
// Populates speakingAudioUrl for speaking questions with mock S3 URLs
// This is a temporary helper to add examiner audio URLs to test data

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id).lean();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Find all speaking questions without speakingAudioUrl
    const speakingQuestions = await Question.find({
      questionType: "speaking",
      $or: [
        { speakingAudioUrl: { $exists: false } },
        { speakingAudioUrl: null },
        { speakingAudioUrl: "" },
      ],
    });

    if (speakingQuestions.length === 0) {
      return NextResponse.json({
        message: "All speaking questions already have audio URLs",
        updated: 0,
      });
    }

    // Generate mock S3 URLs for each question
    // In production, these would be actual TTS-generated audio URLs
    const updates = [];
    for (const q of speakingQuestions) {
      // Mock S3 URL format: https://your-bucket.s3.amazonaws.com/speaking/{questionId}.mp3
      const mockAudioUrl = `https://ielts-speaking-audio.s3.amazonaws.com/mock/${q._id}.mp3`;
      
      updates.push(
        Question.updateOne(
          { _id: q._id },
          { $set: { speakingAudioUrl: mockAudioUrl } }
        )
      );
    }

    await Promise.all(updates);

    return NextResponse.json({
      message: "Speaking audio URLs populated",
      updated: speakingQuestions.length,
      sample: speakingQuestions.slice(0, 3).map(q => ({
        id: q._id,
        questionText: q.questionText?.substring(0, 50),
        audioUrl: `https://ielts-speaking-audio.s3.amazonaws.com/mock/${q._id}.mp3`,
      })),
    });
  } catch (error: any) {
    console.error("Error populating speaking audio URLs:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
