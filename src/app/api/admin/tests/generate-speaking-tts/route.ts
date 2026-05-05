import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Question from "@/models/Question";
import User from "@/models/User";
import { uploadToS3 } from "@/lib/s3Upload";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// POST /api/admin/tests/[id]/generate-speaking-tts
// Generate TTS audio for all speaking questions in a test
// Body: { testId: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { testId } = await req.json();
    if (!testId) {
      return NextResponse.json(
        { message: "testId is required" },
        { status: 400 }
      );
    }

    // Find all speaking questions without audio
    const questions = await Question.find({
      testId,
      questionType: "speaking",
      $or: [
        { speakingAudioUrl: { $exists: false } },
        { speakingAudioUrl: null },
        { speakingAudioUrl: "" },
      ],
    });

    if (questions.length === 0) {
      return NextResponse.json({
        message: "All speaking questions already have audio",
        generated: 0,
      });
    }

    const results = [];
    let generated = 0;
    let failed = 0;

    for (const question of questions) {
      try {
        const textToSpeak = question.speakingPrompt || question.questionText;
        if (!textToSpeak) {
          results.push({
            id: question._id,
            status: "skipped",
            reason: "No text to speak",
          });
          continue;
        }

        // Call OpenAI TTS
        const ttsResponse = await fetch(
          "https://api.openai.com/v1/audio/speech",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "tts-1-hd",
              input: textToSpeak,
              voice: "nova",
              speed: 1.0,
            }),
          }
        );

        if (!ttsResponse.ok) {
          const error = await ttsResponse.text();
          results.push({
            id: question._id,
            status: "failed",
            reason: `OpenAI API error: ${error.substring(0, 100)}`,
          });
          failed++;
          continue;
        }

        // Upload to S3
        const audioBuffer = await ttsResponse.arrayBuffer();
        const folder: "tests/speaking" = "tests/speaking";
        const { url: audioUrl } = await uploadToS3(
          Buffer.from(audioBuffer),
          `question-${question._id}.mp3`,
          "audio/mpeg",
          folder
        );

        // Save to DB
        await Question.updateOne(
          { _id: question._id },
          { $set: { speakingAudioUrl: audioUrl } }
        );

        results.push({
          id: question._id,
          status: "success",
          audioUrl,
          text: textToSpeak.substring(0, 100),
        });
        generated++;
      } catch (err: any) {
        results.push({
          id: question._id,
          status: "failed",
          reason: err?.message || "Unknown error",
        });
        failed++;
      }
    }

    return NextResponse.json({
      message: "TTS generation completed",
      testId,
      total: questions.length,
      generated,
      failed,
      results: results.slice(0, 10), // Show first 10
      resultsSummary: `${generated} generated, ${failed} failed, ${questions.length - generated - failed} skipped`,
    });
  } catch (error: any) {
    console.error("Error generating TTS for test:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
