import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { effectiveTestDurationMinutes } from "@/lib/testDuration";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import { ensureGuestId } from "@/lib/guestSession";
import { randomUUID } from "crypto";
import { computeExpiresAt, computeRemainingSeconds } from "@/lib/attemptTiming";
import { getAttemptSessionId, checkAttemptSession } from "@/lib/attemptSession";
import { submitAttemptDoc } from "@/lib/attemptSubmission";

// GET /api/attempts  — user's own attempts history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, any> = { userId: session.user.id };
    if (examType) filter.examType = examType;
    if (status) filter.status = status;

    const [attempts, total] = await Promise.all([
      Attempt.find(filter)
        .populate("testId", "title module examType duration")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Attempt.countDocuments(filter),
    ]);

    return NextResponse.json({
      attempts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/attempts  — start a new attempt
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await connectDB();

    const { testId } = await req.json();
    if (!testId) {
      return NextResponse.json({ message: "testId is required" }, { status: 400 });
    }

    const test = await Test.findOne({ _id: testId, status: "published" }).lean();
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    let actor: { kind: "user"; id: string } | { kind: "guest"; id: string } | null = null;
    if (session?.user?.id) {
      const activePlans = await Plan.find({ isActive: true })
        .select("slug tierRank displayOrder")
        .lean();

      const subscription = (await Subscription.findOne({
        userId: session.user.id,
        status: { $in: ["active", "trial"] },
        endDate: { $gte: new Date() },
      })
        .populate({ path: "planId", select: "slug tierRank displayOrder" })
        .lean()) as any;

      const safeTierRank = (p: { tierRank?: number; displayOrder?: number } | null | undefined): number => {
        const tr = Number((p as any)?.tierRank);
        if (Number.isFinite(tr) && tr >= 1) return tr;
        const d = Number((p as any)?.displayOrder);
        if (Number.isFinite(d) && d >= 1) return d;
        return 1;
      };

      let accessibleSlugs: string[] = [];
      if (subscription?.planId) {
        const userTierRank = safeTierRank(subscription.planId);
        accessibleSlugs = (activePlans as any[])
          .filter((p) => safeTierRank(p) <= userTierRank)
          .map((p) => String(p.slug));
      }
      if (!accessibleSlugs.includes("free")) accessibleSlugs = ["free", ...accessibleSlugs];
      if (!accessibleSlugs.includes(String(test.accessLevel))) {
        return NextResponse.json({ message: "Upgrade required" }, { status: 403 });
      }

      actor = { kind: "user", id: session.user.id };
    } else {
      if (String(test.accessLevel) !== "free") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      const res = NextResponse.json({}, { status: 200 });
      const guestId = ensureGuestId(req, res);
      actor = { kind: "guest", id: guestId };
      // We can't return the placeholder response; we'll rebuild the real response below.
    }

    // Reuse or replace in-progress attempt (must match client timer / test card duration)
    const existingFilter: Record<string, unknown> = { testId, status: "in_progress" };
    if (actor.kind === "user") existingFilter.userId = actor.id;
    else existingFilter.guestId = actor.id;
    const existing = await Attempt.findOne(existingFilter);
    if (existing) {
      const mins = effectiveTestDurationMinutes(test);
      if (mins > 0) {
        const totalSecs = mins * 60;
        const remaining = computeRemainingSeconds({
          startedAt: new Date(existing.startedAt),
          durationSeconds: totalSecs,
          now: new Date(),
        });

        const incomingSessionId = getAttemptSessionId(req) ?? randomUUID();
        const sessionCheck = checkAttemptSession({
          attempt: existing,
          incomingSessionId,
          now: new Date(),
        });

        if (remaining > 0) {
          if (!sessionCheck.ok) {
            return NextResponse.json(
              { message: sessionCheck.reason === "missing_session" ? "Missing session" : "Attempt is active in another session" },
              { status: 409 }
            );
          }

          if (sessionCheck.takeover) {
            existing.activeSessionId = incomingSessionId!;
          }
          existing.lastSeenAt = new Date();
          existing.durationSeconds = totalSecs;
          existing.expiresAt = computeExpiresAt({ startedAt: new Date(existing.startedAt), durationSeconds: totalSecs });
          await existing.save();

          return NextResponse.json({ attempt: existing, resumed: true, sessionId: existing.activeSessionId });
        }

        const actorFilter =
          actor.kind === "user" ? ({ userId: actor.id } as const) : ({ guestId: actor.id } as const);
        await submitAttemptDoc({ attempt: existing, actor: actorFilter, now: new Date() });
      } else {
        const incomingSessionId = getAttemptSessionId(req) ?? randomUUID();
        const sessionCheck = checkAttemptSession({
          attempt: existing,
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
          existing.activeSessionId = incomingSessionId!;
        }
        existing.lastSeenAt = new Date();
        await existing.save();
        return NextResponse.json({ attempt: existing, resumed: true, sessionId: existing.activeSessionId });
      }
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const attemptDoc: Record<string, unknown> = {
      testId,
      status: "in_progress",
      startedAt: new Date(),
      examType: test.examType,
      module: test.module,
      totalMarks: test.totalQuestions,
      ipAddress,
      durationSeconds: effectiveTestDurationMinutes(test) > 0 ? effectiveTestDurationMinutes(test) * 60 : undefined,
    };
    if (actor.kind === "user") attemptDoc.userId = actor.id;
    else attemptDoc.guestId = actor.id;

    const sessionId = randomUUID();
    attemptDoc.activeSessionId = sessionId;
    attemptDoc.lastSeenAt = new Date();
    if (typeof attemptDoc.durationSeconds === "number" && attemptDoc.durationSeconds > 0) {
      attemptDoc.expiresAt = computeExpiresAt({
        startedAt: attemptDoc.startedAt as Date,
        durationSeconds: attemptDoc.durationSeconds as number,
      });
    }

    const attempt = await Attempt.create(attemptDoc);

    const res = NextResponse.json({ attempt, resumed: false, sessionId }, { status: 201 });
    if (!session) {
      // Make sure guest cookie exists on response if caller is a guest.
      ensureGuestId(req, res);
    }
    return res;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
