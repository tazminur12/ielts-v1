import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import { getGuestId } from "@/lib/guestSession";
import { z } from "zod";
import { getAttemptSessionId, checkAttemptSession } from "@/lib/attemptSession";
import { computeRemainingSeconds } from "@/lib/attemptTiming";
import { submitAttemptDoc } from "@/lib/attemptSubmission";
import { getAiQueue } from "@/lib/bullmq";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

const SubmitSchema = z.object({ action: z.literal("submit") }).strict();

// GET /api/attempts/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = requestLogger(req);
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
    log.error({ error }, "attempt_fetch_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/attempts/[id]" });
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/attempts/[id]/submit  — handled via PATCH with action:"submit"
// PATCH /api/attempts/[id]  — submit attempt & calculate score
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    SubmitSchema.parse(await req.json());

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: id, userId: session.user.id } : { _id: id, guestId }
    );
    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const incomingSessionId = getAttemptSessionId(req);
    const sessionCheck = checkAttemptSession({
      attempt,
      incomingSessionId,
      now: new Date(),
    });
    if (!sessionCheck.ok) {
      return NextResponse.json(
        { message: sessionCheck.reason === "missing_session" ? "Missing session" : "Attempt is active in another session" },
        { status: 409 }
      );
    }
    if (sessionCheck.takeover) {
      attempt.activeSessionId = incomingSessionId!;
    }
    attempt.lastSeenAt = new Date();
    await attempt.save();

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ message: "Attempt is not in progress" }, { status: 400 });
    }

    const actor = session?.user?.id ? ({ userId: session.user.id } as const) : ({ guestId: guestId! } as const);
    const result = await submitAttemptDoc({ attempt, actor, now: new Date() });

    const updated = await Attempt.findById(id).populate("testId", "title module examType").lean();
    const durationSeconds = Number(updated?.durationSeconds || 0);
    const remainingSeconds =
      durationSeconds > 0 && updated?.startedAt
        ? computeRemainingSeconds({ startedAt: new Date(updated.startedAt), durationSeconds, now: new Date() })
        : 0;

    if (result.status === "submitted") {
      const queue = getAiQueue();
      if (queue) {
        const answers = await Answer.find({ attemptId: id, ...(actor as any) }).select("_id questionType").lean();
        for (const a of answers as any[]) {
          if (a.questionType === "essay") {
            await queue.add(
              "writing_eval",
              { answerId: String(a._id), attemptId: id },
              { jobId: `writing_eval:${id}:${String(a._id)}` }
            );
          }
          if (a.questionType === "speaking") {
            await queue.add(
              "speaking_eval",
              { answerId: String(a._id), attemptId: id },
              { jobId: `speaking_eval:${id}:${String(a._id)}` }
            );
          }
        }
      }
    }

    const latest = await Attempt.findById(id).populate("testId", "title module examType").lean();
    return NextResponse.json({ ...latest, remainingSeconds, status: latest?.status });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }
    log.error({ error }, "attempt_submit_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/attempts/[id]" });
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
