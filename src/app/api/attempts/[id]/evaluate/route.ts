import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import Section from "@/models/Section";
import { getGuestId } from "@/lib/guestSession";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { z } from "zod";
import { getAiQueue } from "@/lib/bullmq";
import { calculateOverallBand } from "@/lib/aiEvaluation";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({}).strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    BodySchema.parse(await req.json().catch(() => ({})));
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const limiterKey = session?.user?.id ? `user:${session.user.id}` : `guest:${guestId}`;
    await rateLimitOrThrow(limiterKey, "ai_eval_step");

    await connectDB();
    const { id } = await params;

    const actor = session?.user?.id ? ({ userId: session.user.id } as const) : ({ guestId: guestId! } as const);

    const attempt: any = await Attempt.findOne({ _id: id, ...(actor as any) }).lean();
    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (attempt.status !== "submitted") return NextResponse.json({ ok: true, status: attempt.status });

    const answers: any[] = await Answer.find({ attemptId: id, ...(actor as any) }).lean();

    const pendingSpeaking = answers.find(
      (a) => a.questionType === "speaking" && typeof a.aiEvaluation?.bandScore !== "number" && typeof a.audioUrl === "string" && a.audioUrl.trim()
    );
    if (pendingSpeaking) {
      // ✅ Queue speaking evaluation instead of blocking
      const aiQueue = getAiQueue();
      if (aiQueue) {
        await aiQueue.add('evaluate-speaking', {
          answerId: String(pendingSpeaking._id),
          attemptId: id,
          userId: session?.user?.id || null,
          guestId: guestId || null,
        }, {
          priority: 50, // Higher priority for speaking
          delay: 0,
          attempts: 3,
        });
      }

      // Return immediately - evaluation happens in background
      return NextResponse.json({ 
        ok: true, 
        status: "submitted", 
        queued: true,
        message: "Speaking evaluation queued"
      });
    }

    const pendingWriting = answers.find(
      (a) => a.questionType === "essay" && !a.writingEvaluation?.overallBand && typeof a.textAnswer === "string" && a.textAnswer.trim()
    );
    if (pendingWriting) {
      // ✅ Queue writing evaluation instead of blocking
      const aiQueue = getAiQueue();
      if (aiQueue) {
        await aiQueue.add('evaluate-writing', {
          answerId: String(pendingWriting._id),
          attemptId: id,
          userId: session?.user?.id || null,
          guestId: guestId || null,
        }, {
          priority: 40, // Lower priority than speaking
          delay: 0,
          attempts: 3,
        });
      }

      // Return immediately - evaluation happens in background
      return NextResponse.json({ 
        ok: true, 
        status: "submitted", 
        queued: true,
        message: "Writing evaluation queued"
      });
    }

    const refreshedAnswers: any[] = await Answer.find({ attemptId: id, ...(actor as any) }).lean();
    const essayAnswers = refreshedAnswers.filter((a) => a.questionType === "essay" && typeof a.writingEvaluation?.overallBand === "number");
    const speakingAnswers = refreshedAnswers.filter((a) => a.questionType === "speaking" && typeof a.aiEvaluation?.bandScore === "number");

    const speakingBand = speakingAnswers.length ? Math.round((speakingAnswers.reduce((s, a) => s + Number(a.aiEvaluation.bandScore), 0) / speakingAnswers.length) * 2) / 2 : 0;

    const essayQuestionIds = essayAnswers.map((a) => a.questionId);
    const essayQuestions: any[] =
      essayQuestionIds.length > 0 ? await Question.find({ _id: { $in: essayQuestionIds } }).select("sectionId").lean() : [];
    const sectionIds = essayQuestions.map((q) => q.sectionId).filter(Boolean);
    const sections: any[] =
      sectionIds.length > 0 ? await Section.find({ _id: { $in: sectionIds } }).select("_id partNumber order").lean() : [];
    const partBySectionId = new Map(sections.map((s) => [String(s._id), Number(s.partNumber || s.order || 1)]));
    const qSectionByQId = new Map(essayQuestions.map((q) => [String(q._id), String(q.sectionId)]));

    const task1Bands: number[] = [];
    const task2Bands: number[] = [];
    for (const a of essayAnswers) {
      const qId = String(a.questionId);
      const secId = qSectionByQId.get(qId);
      const pn = secId ? partBySectionId.get(String(secId)) : 1;
      const b = Number(a.writingEvaluation.overallBand);
      if (pn === 2) task2Bands.push(b);
      else task1Bands.push(b);
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const roundHalf = (x: number) => Math.round(x * 2) / 2;
    const task1 = avg(task1Bands);
    const task2 = avg(task2Bands);
    const writingBand = task1 && task2 ? roundHalf((task1 + task2 * 2) / 3) : roundHalf(task2 || task1 || 0);

    const attemptModule = String(attempt.module || "");
    const isFull = attemptModule === "full";
    const listeningBand = Number(attempt.sectionBands?.listening || 0);
    const readingBand = Number(attempt.sectionBands?.reading || 0);

    const sectionBands = {
      ...(attempt.sectionBands || {}),
      ...(writingBand ? { writing: writingBand } : {}),
      ...(speakingBand ? { speaking: speakingBand } : {}),
    };

    const overallBand =
      isFull
        ? listeningBand && readingBand && writingBand && speakingBand
          ? calculateOverallBand({ listening: listeningBand, reading: readingBand, writing: writingBand, speaking: speakingBand })
          : null
        : attemptModule === "speaking"
        ? speakingBand || null
        : attemptModule === "writing"
        ? writingBand || null
        : null;

    const status =
      isFull ? (overallBand != null ? "evaluated" : "submitted") : overallBand != null ? "evaluated" : "submitted";

    await Attempt.findByIdAndUpdate(id, {
      $set: {
        status,
        sectionBands,
        ...(overallBand != null ? { overallBand, bandScore: overallBand } : {}),
      },
    });

    return NextResponse.json({ ok: true, status, processed: null });
  } catch (error: any) {
    if (error?.message === "rate_limited") {
      const retryAfter = Number(error?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    if (error?.name === "ZodError") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

