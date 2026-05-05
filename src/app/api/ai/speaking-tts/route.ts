import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Question from "@/models/Question";
import { uploadToS3 } from "@/lib/s3Upload";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// POST /api/ai/speaking-tts
// Generate TTS audio for a speaking question and save to S3
// Body: { questionId: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { questionId } = await req.json();
    if (!questionId) {
      return NextResponse.json(
        { message: "questionId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    if (question.questionType !== "speaking") {
      return NextResponse.json(
        { message: "Only speaking questions can have TTS audio" },
        { status: 400 }
      );
    }

    // Check if audio already exists
    if (question.speakingAudioUrl) {
      return NextResponse.json({
        message: "Audio already exists for this question",
        audioUrl: question.speakingAudioUrl,
      });
    }

    // Get the text to read (speaking prompt or question text)
    const textToSpeak = question.speakingPrompt || question.questionText;
    if (!textToSpeak) {
      return NextResponse.json(
        { message: "No speaking prompt or question text found" },
        { status: 400 }
      );
    }

    // Call OpenAI TTS API
    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd", // High quality
        input: textToSpeak,
        voice: "nova", // Professional, neutral voice
        speed: 1.0, // Normal speed
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error("OpenAI TTS error:", error);
      return NextResponse.json(
        { message: "Failed to generate TTS audio", error },
        { status: 500 }
      );
    }

    // Get audio as buffer
    const audioBuffer = await ttsResponse.arrayBuffer();

    // Upload to S3
    const folder: "tests/speaking" = "tests/speaking";
    const { url: audioUrl } = await uploadToS3(
      Buffer.from(audioBuffer),
      `question-${question._id}.mp3`,
      "audio/mpeg",
      folder
    );

    // Save URL to database
    question.speakingAudioUrl = audioUrl;
    await question.save();

    return NextResponse.json({
      message: "TTS audio generated and saved successfully",
      questionId: question._id,
      audioUrl,
      textRead: textToSpeak,
    });
  } catch (error: any) {
    console.error("Error generating TTS audio:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET /api/ai/speaking-tts?questionId=xxx
// Get TTS status and regenerate if needed
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { message: "questionId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      questionId: question._id,
      hasAudio: !!question.speakingAudioUrl,
      audioUrl: question.speakingAudioUrl || null,
      textToSpeak: question.speakingPrompt || question.questionText,
    });
  } catch (error: any) {
    console.error("Error checking TTS status:", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
