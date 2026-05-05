import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { getGuestId } from "@/lib/guestSession";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import Section from "@/models/Section";
import { uploadToS3 } from "@/lib/s3Upload";
import { transcribeAudio } from "@/lib/aiEvaluation";
import OpenAI from "openai";
import { z } from "zod";
import { getSpeakingTtsQueue } from "@/lib/bullmq";
import { synthesizeListeningAudioToS3 } from "@/lib/listeningTts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BodySchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  partNumber: z.string().optional(),
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
    const rawAttemptId = formData.get("attemptId");
    const rawQuestionId = formData.get("questionId");
    const rawPartNumber = formData.get("partNumber");
    const rawNextPrompt = formData.get("nextPrompt");
    const audioFile = formData.get("audio") as File | null;

    const normalizeString = (value: FormDataEntryValue | null): string | undefined => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    };

    const attemptIdValue = normalizeString(rawAttemptId);
    const questionIdValue = normalizeString(rawQuestionId);
    const partNumberValue = normalizeString(rawPartNumber);
    const nextPromptValue = typeof rawNextPrompt === "string" ? rawNextPrompt : undefined;

    const parsed = BodySchema.safeParse({
      attemptId: attemptIdValue,
      questionId: questionIdValue,
      partNumber: partNumberValue,
      nextPrompt: nextPromptValue,
    });

    if (!parsed.success || !audioFile) {
      const missingFields: string[] = [];
      const invalidFields: string[] = [];
      if (!attemptIdValue) missingFields.push("attemptId");
      if (!questionIdValue) missingFields.push("questionId");
      if (!audioFile) missingFields.push("audio");
      if (rawAttemptId && typeof rawAttemptId !== "string") invalidFields.push("attemptId");
      if (rawQuestionId && typeof rawQuestionId !== "string") invalidFields.push("questionId");
      if (rawPartNumber && typeof rawPartNumber !== "string") invalidFields.push("partNumber");
      return NextResponse.json(
        {
          message: "Missing required fields",
          missingFields,
          invalidFields,
        },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { message: "Audio file is empty", audioSize: audioFile.size, audioType: audioFile.type },
        { status: 400 }
      );
    }

    const { attemptId, questionId, partNumber, nextPrompt } = parsed.data;
    const pnFromBody = partNumber ? Number(partNumber) : NaN;
    if (partNumber && (!Number.isFinite(pnFromBody) || pnFromBody <= 0)) {
      return NextResponse.json({ message: "Invalid partNumber", partNumber }, { status: 400 });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      ...(session?.user?.id ? { userId: session.user.id } : { guestId: guestId! }),
    }).lean();
    if (!attempt) return NextResponse.json({ message: "Attempt not found" }, { status: 404 });

    const question: any = await Question.findById(questionId).lean();
    if (!question) return NextResponse.json({ message: "Question not found" }, { status: 404 });

    let pn = Number.isFinite(pnFromBody) ? pnFromBody : NaN;
    if (!Number.isFinite(pn) || pn <= 0) {
      const section = await Section.findById(question.sectionId).lean();
      const derived = Number((section as any)?.partNumber || (section as any)?.order || 1);
      pn = Number.isFinite(derived) && derived > 0 ? derived : 1;
    }

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
          questionText: String((question as any).speakingPrompt || (question as any).questionText || "").trim(),
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

    let aiAudioUrl: string | null = null;
    const forceInlineTts = process.env.SPEAKING_TTS_INLINE === "true";

    // ✅ QUEUE TTS for background processing when available (unless forced inline)
    const ttsQueue = forceInlineTts ? null : getSpeakingTtsQueue();
    if (ttsQueue) {
      try {
        await ttsQueue.add(
          "generate-tts",
          {
            text: replyText,
            attemptId,
            questionId,
            answerId: String((answer as any)?._id || ""),
          },
          {
            priority: 10,
            delay: 100,
          }
        );
      } catch {
        // If queueing fails, fall back to inline generation below
      }
    }

    if (!ttsQueue || forceInlineTts) {
      // Fallback: generate TTS inline when worker/Redis isn't running
      const ttsResult = await synthesizeListeningAudioToS3(
        replyText,
        `speak-ai-${attemptId}-${questionId}`
      );
      if (ttsResult?.url) {
        aiAudioUrl = ttsResult.url;
        await Answer.findByIdAndUpdate(
          (answer as any)?._id,
          { $set: { aiAudioUrl, aiAudioGeneratedAt: new Date() } },
          { new: true }
        );
      }
    }

    return NextResponse.json({
      answerId: String((answer as any)?._id || ""),
      audioUrl: uploaded.url,
      transcribedText,
      aiText: replyText,
      aiAudioUrl,
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

