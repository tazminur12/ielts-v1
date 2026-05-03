import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { getGuestId } from "@/lib/guestSession";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import { uploadToS3 } from "@/lib/s3Upload";
import { transcribeAudio } from "@/lib/aiEvaluation";
import OpenAI from "openai";
import { z } from "zod";
import { synthesizeListeningAudioToS3 } from "@/lib/listeningTts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BodySchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  partNumber: z.string().min(1),
  nextPrompt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const limiterKey = session?.user?.id ? `user:${session.user.id}` : `guest:${guestId}`;
    await rateLimitOrThrow(limiterKey, "ai_speaking_interview");

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ message: "AI is not configured" }, { status: 500 });
    }

    await connectDB();

    const formData = await req.formData();
    const parsed = BodySchema.safeParse({
      attemptId: formData.get("attemptId"),
      questionId: formData.get("questionId"),
      partNumber: formData.get("partNumber"),
      nextPrompt: formData.get("nextPrompt"),
    });
    const audioFile = formData.get("audio") as File | null;

    if (!parsed.success || !audioFile) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const { attemptId, questionId, partNumber, nextPrompt } = parsed.data;
    const pn = Number(partNumber);

    const attempt = await Attempt.findOne({
      _id: attemptId,
      ...(session?.user?.id ? { userId: session.user.id } : { guestId: guestId! }),
    }).lean();
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    const question: any = await Question.findById(questionId).lean();
    if (!question) return NextResponse.json({ message: "Question not found" }, { status: 404 });

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const uploaded = await uploadToS3(buffer, audioFile.name, audioFile.type, "tests/speaking");

    const transcribedText = await transcribeAudio(buffer, audioFile.type);

    const answer = await Answer.findOneAndUpdate(
      { attemptId, questionId },
      {
        $set: {
          attemptId,
          testId: attempt.testId,
          questionId,
          questionNumber: (question as any).questionNumber,
          questionType: (question as any).questionType,
          audioUrl: uploaded.url,
          transcribedText,
          ...(session?.user?.id ? { userId: session.user.id } : { guestId: guestId! }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    const currentPrompt = String(question.speakingPrompt || question.questionText || "").trim();
    const nextQ = String(nextPrompt || "").trim();

    const systemPrompt = `You are an IELTS Speaking examiner (British Council / IDP style). You are running a turn-based speaking interview in a web app.

Rules:
- Keep it natural and examiner-like.
- Do NOT mention AI, models, or technology.
- Do NOT give band scores or feedback during the interview.
- Output must be short and clear for TTS.`;

    const userPrompt = `Part: ${Number.isFinite(pn) ? pn : 1}
Current prompt: ${currentPrompt}
Candidate response (transcript): ${transcribedText}

Next prompt (if provided, you must use it verbatim): ${nextQ || "(none)"}

Return ONLY valid JSON in this exact shape:
{ "replyText": "..." }

If next prompt is provided, replyText should be 1 short sentence acknowledging and then ask the next prompt.
If no next prompt is provided, replyText should politely end this part.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_INTERVIEW_MODEL?.trim() || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const raw = completion.choices[0].message.content || "{}";
    const json = JSON.parse(raw) as { replyText?: string };
    const replyText = String(json.replyText || "").trim() || (nextQ ? `Thank you. ${nextQ}` : "Thank you. This is the end of the speaking test.");

    const tts = await synthesizeListeningAudioToS3(replyText, `speak-ai-${attemptId}-${questionId}`); 

    return NextResponse.json({
      answerId: String((answer as any)?._id || ""),
      audioUrl: uploaded.url,
      transcribedText,
      aiText: replyText,
      aiAudioUrl: tts?.url || null,
    });
  } catch (error: any) {
    if (error?.message === "rate_limited") {
      const retryAfter = Number(error?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

