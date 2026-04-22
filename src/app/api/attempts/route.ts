import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { effectiveTestDurationMinutes } from "@/lib/testDuration";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import Plan from "@/models/Plan";
import { ensureGuestId } from "@/lib/guestSession";

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

    // Allow guests to start attempts only for the lowest (free) plan tests.
    let actor: { kind: "user"; id: string } | { kind: "guest"; id: string } | null = null;
    if (session?.user?.id) {
      actor = { kind: "user", id: session.user.id };
    } else {
      const freePlan = await Plan.findOne({ isActive: true })
        .sort({ displayOrder: 1 })
        .select("slug")
        .lean() as { slug: string } | null;
      const freeSlug = freePlan?.slug ?? "free";
      if (String(test.accessLevel) !== String(freeSlug)) {
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
        const startMs = existing.startedAt
          ? new Date(existing.startedAt).getTime()
          : Date.now();
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        if (elapsed < totalSecs) {
          return NextResponse.json({ attempt: existing, resumed: true });
        }
        await Attempt.findByIdAndUpdate(existing._id, {
          status: "submitted",
          submittedAt: new Date(),
          timeSpent: Math.min(elapsed, totalSecs),
        });
      } else {
        return NextResponse.json({ attempt: existing, resumed: true });
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
    };
    if (actor.kind === "user") attemptDoc.userId = actor.id;
    else attemptDoc.guestId = actor.id;

    const attempt = await Attempt.create(attemptDoc);

    const res = NextResponse.json({ attempt, resumed: false }, { status: 201 });
    if (!session) {
      // Make sure guest cookie exists on response if caller is a guest.
      ensureGuestId(req, res);
    }
    return res;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
