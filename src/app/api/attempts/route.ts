import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";

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
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const { testId } = await req.json();
    if (!testId) {
      return NextResponse.json({ message: "testId is required" }, { status: 400 });
    }

    const test = await Test.findOne({ _id: testId, status: "published" }).lean();
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    // Check for existing in-progress attempt
    const existing = await Attempt.findOne({
      userId: session.user.id,
      testId,
      status: "in_progress",
    });
    if (existing) {
      return NextResponse.json({ attempt: existing, resumed: true });
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const attempt = await Attempt.create({
      userId: session.user.id,
      testId,
      status: "in_progress",
      startedAt: new Date(),
      examType: test.examType,
      module: test.module,
      totalMarks: test.totalQuestions,
      ipAddress,
    });

    return NextResponse.json({ attempt, resumed: false }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
