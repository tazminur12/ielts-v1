import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import { transcribeAudio, evaluateSpeaking } from "@/lib/aiEvaluation";
import { uploadToS3 } from "@/lib/s3Upload";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { withCacheHeaders } from "@/lib/httpCache";

// POST /api/ai/speaking  (multipart/form-data)
// Fields: attemptId, answerId, prompt, audio (file)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await rateLimitOrThrow(session.user.id, "ai_speaking");
    await connectDB();

    const formData = await req.formData();
    const attemptId = formData.get("attemptId") as string;
    const answerId = formData.get("answerId") as string;
    const prompt = formData.get("prompt") as string;
    const audioFile = formData.get("audio") as File | null;

    if (!attemptId || !answerId || !prompt || !audioFile) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const attempt = await Attempt.findOne({ _id: attemptId, userId: session.user.id });
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    // Upload audio to S3
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const uploaded = await uploadToS3(buffer, audioFile.name, audioFile.type, "tests/speaking");

    // Transcribe with Whisper
    const transcribedText = await transcribeAudio(buffer, audioFile.type);

    // Evaluate with GPT
    const evaluation = await evaluateSpeaking(prompt, transcribedText);

    // Save to Answer
    const updatedAnswer = await Answer.findByIdAndUpdate(
      answerId,
      {
        $set: {
          audioUrl: uploaded.url,
          transcribedText,
          aiEvaluation: {
            bandScore: evaluation.bandScore,
            grammarScore: evaluation.grammarScore,
            vocabularyScore: evaluation.vocabularyScore,
            coherenceScore: evaluation.fluencyScore,
            feedback: evaluation.feedback,
            suggestions: evaluation.suggestions,
            evaluatedAt: new Date(),
          },
          marksAwarded: evaluation.bandScore,
        },
      },
      { new: true }
    );

    // Update attempt
    await Attempt.findByIdAndUpdate(attemptId, {
      $set: {
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
        transcribedText,
        audioUrl: uploaded.url,
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
    console.error("Speaking AI evaluation error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
