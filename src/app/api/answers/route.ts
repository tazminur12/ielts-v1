import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import { getGuestId } from "@/lib/guestSession";
import { z } from "zod";
import { getAttemptSessionId, checkAttemptSession } from "@/lib/attemptSession";
import { computeRemainingSeconds } from "@/lib/attemptTiming";
import { submitAttemptDoc } from "@/lib/attemptSubmission";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";

const SaveAnswerSchema = z
  .object({
    attemptId: z.string().min(1),
    questionId: z.string().min(1),
    questionNumber: z.number().int().min(1),
    questionType: z.string().min(1),
    selectedOption: z.string().max(500).optional(),
    textAnswer: z.string().max(20000).optional(),
    matchedAnswer: z.string().max(20000).optional(),
    booleanAnswer: z.string().max(50).optional(),
  })
  .strict();

// POST /api/answers  — save or update a single answer during exam
export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    const body = SaveAnswerSchema.parse(await req.json());
    const { attemptId, questionId, questionNumber, questionType } = body;

    if (!attemptId || !questionId || questionNumber === undefined || !questionType) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify the attempt belongs to this actor
    const attemptFilter: Record<string, unknown> = { _id: attemptId, status: "in_progress" };
    if (session?.user?.id) attemptFilter.userId = session.user.id;
    else attemptFilter.guestId = guestId;

    const attempt = await Attempt.findOne(attemptFilter);
    if (!attempt) {
      return NextResponse.json({ message: "Active attempt not found" }, { status: 404 });
    }

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

    const durationSeconds = Number(attempt.durationSeconds || 0);
    if (durationSeconds > 0) {
      const remainingSeconds = computeRemainingSeconds({
        startedAt: new Date(attempt.startedAt),
        durationSeconds,
        now: new Date(),
      });
      if (remainingSeconds === 0) {
        const actor = session?.user?.id ? ({ userId: session.user.id } as const) : ({ guestId: guestId! } as const);
        await submitAttemptDoc({ attempt, actor, now: new Date() });
        return NextResponse.json({ message: "Time expired" }, { status: 409 });
      }
    }

    // Upsert answer (student can change answer before submit)
    const identity: Record<string, unknown> = session?.user?.id
      ? { userId: session.user.id }
      : { guestId };

    const update: Record<string, unknown> = {
      attemptId,
      questionId,
      questionNumber,
      questionType,
      ...(typeof body.selectedOption === "string" ? { selectedOption: body.selectedOption } : {}),
      ...(typeof body.textAnswer === "string" ? { textAnswer: body.textAnswer } : {}),
      ...(typeof body.matchedAnswer === "string" ? { matchedAnswer: body.matchedAnswer } : {}),
      ...(typeof body.booleanAnswer === "string" ? { booleanAnswer: body.booleanAnswer } : {}),
    };

    const answer = await Answer.findOneAndUpdate(
      { attemptId, questionId },
      {
        $set: {
          ...update,
          ...identity,
          testId: attempt.testId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(answer, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }
    log.error({ error }, "answer_save_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/answers" });
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// GET /api/answers?attemptId=xxx  — get all answers for an attempt
export async function GET(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    const attemptId = new URL(req.url).searchParams.get("attemptId");
    if (!attemptId) return NextResponse.json({ message: "attemptId is required" }, { status: 400 });

    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure attempt belongs to actor
    const attemptFilter: Record<string, unknown> = { _id: attemptId };
    if (session?.user?.id) attemptFilter.userId = session.user.id;
    else attemptFilter.guestId = guestId;
    const attempt = await Attempt.findOne(attemptFilter);
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

    const answers = await Answer.find({
      attemptId,
      ...(session?.user?.id ? { userId: session.user.id } : { guestId }),
    }).lean();

    return NextResponse.json(answers);
  } catch (error: any) {
    log.error({ error }, "answers_fetch_error");
    captureException(error, { requestId: req.headers.get("x-request-id") || "unknown", route: "/api/answers" });
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
