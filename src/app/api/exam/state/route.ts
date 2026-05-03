import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import { getGuestId } from "@/lib/guestSession";
import { getAttemptSessionId, checkAttemptSession } from "@/lib/attemptSession";
import { computeRemainingSeconds } from "@/lib/attemptTiming";
import { submitAttemptDoc } from "@/lib/attemptSubmission";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const attemptId = url.searchParams.get("attemptId");
    const takeover = url.searchParams.get("takeover") === "1";
    if (!attemptId) return NextResponse.json({ message: "attemptId is required" }, { status: 400 });

    await connectDB();

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: attemptId, userId: session.user.id } : { _id: attemptId, guestId }
    );
    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const incomingSessionId = getAttemptSessionId(req);
    const sessionCheck = checkAttemptSession({
      attempt,
      incomingSessionId,
      now: new Date(),
    });
    if (!sessionCheck.ok) {
      if (takeover && sessionCheck.reason === "locked" && incomingSessionId) {
        attempt.activeSessionId = incomingSessionId;
        attempt.lastSeenAt = new Date();
        await attempt.save();
      } else {
      return NextResponse.json(
        { message: sessionCheck.reason === "missing_session" ? "Missing session" : "Attempt is active in another session" },
        { status: 409 }
      );
      }
    }

    if (sessionCheck.ok && sessionCheck.takeover) {
      attempt.activeSessionId = incomingSessionId!;
    }
    attempt.lastSeenAt = new Date();
    await attempt.save();

    const durationSeconds = Number(attempt.durationSeconds || 0);
    const remainingSeconds =
      attempt.status === "in_progress" && durationSeconds > 0
        ? computeRemainingSeconds({ startedAt: new Date(attempt.startedAt), durationSeconds, now: new Date() })
        : 0;

    if (attempt.status === "in_progress" && durationSeconds > 0 && remainingSeconds === 0) {
      const actor = session?.user?.id ? ({ userId: session.user.id } as const) : ({ guestId: guestId! } as const);
      const r = await submitAttemptDoc({ attempt, actor, now: new Date() });
      return NextResponse.json({
        status: r.status,
        remainingSeconds: 0,
      });
    }

    return NextResponse.json({
      status: attempt.status,
      remainingSeconds,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
