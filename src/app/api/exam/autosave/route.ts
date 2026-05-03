import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getGuestId } from "@/lib/guestSession";
import { z } from "zod";
import { getAttemptSessionId, checkAttemptSession } from "@/lib/attemptSession";

const AutosaveSchema = z
  .object({
    attemptId: z.string().min(1),
    answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
    timeRemaining: z.number().int().min(0).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = AutosaveSchema.parse(await req.json());
    const { attemptId, answers, timeRemaining } = body;

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID is required" }, { status: 400 });
    }

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: attemptId, userId: session.user.id } : { _id: attemptId, guestId }
    );
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    const incomingSessionId = getAttemptSessionId(req);
    const sessionCheck = checkAttemptSession({
      attempt,
      incomingSessionId,
      now: new Date(),
    });
    if (!sessionCheck.ok) {
      return NextResponse.json(
        { error: sessionCheck.reason === "missing_session" ? "Missing session" : "Attempt is active in another session" },
        { status: 409 }
      );
    }
    if (sessionCheck.takeover) {
      attempt.activeSessionId = incomingSessionId!;
    }

    // Update attempt
    attempt.lastAutoSave = new Date();
    attempt.timeRemaining = timeRemaining;
    attempt.lastSeenAt = new Date();
    await attempt.save();

    // Update answers if provided
    if (answers && Object.keys(answers).length > 0) {
      const identity: Record<string, unknown> = session?.user?.id ? { userId: session.user.id } : { guestId };
      for (const [questionId, answer] of Object.entries(answers)) {
        const v = Array.isArray(answer) ? answer.join(", ") : answer;
        await Answer.findOneAndUpdate(
          { attemptId, questionId },
          {
            $set: {
              ...identity,
              textAnswer: v,
            },
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ saved: true, serverTime: new Date().toISOString() });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
