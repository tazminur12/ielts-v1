import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") +
    "-" +
    Date.now()
  );
}

// GET /api/admin/tests — list all tests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType");
    const moduleFilter = searchParams.get("module");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, any> = {};
    if (examType) filter.examType = examType;
    if (moduleFilter) filter.module = moduleFilter;
    if (status) filter.status = status;

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      Test.countDocuments(filter),
    ]);

    return NextResponse.json({
      tests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/admin/tests — create a new test
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const {
      title,
      description,
      examType,
      type,
      module,
      accessLevel,
      duration,
      totalQuestions,
      tags,
      difficulty,
      rating,
      usersCount,
      targetBand,
      instructions,
    } = body;

    if (!title || !examType || !module) {
      return NextResponse.json(
        { message: "title, examType and module are required" },
        { status: 400 }
      );
    }

    const slug = generateSlug(title);

    const test = await Test.create({
      title,
      slug,
      description,
      examType,
      type,
      module,
      accessLevel: accessLevel || "free",
      duration: duration || 0,
      totalQuestions: totalQuestions || 0,
      tags,
      difficulty,
      rating: rating ?? 0,
      usersCount: usersCount ?? 0,
      targetBand,
      instructions,
      status: "draft",
      createdBy: session.user.id,
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
