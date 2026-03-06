import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import QuestionGroup from "@/models/QuestionGroup";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/question-groups?sectionId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const sectionId = new URL(req.url).searchParams.get("sectionId");
    if (!sectionId) {
      return NextResponse.json({ message: "sectionId is required" }, { status: 400 });
    }

    const groups = await QuestionGroup.find({ sectionId }).sort({ order: 1 }).lean();
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/admin/question-groups
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { sectionId, testId, questionType, order, questionNumberStart, questionNumberEnd } = body;

    if (!sectionId || !testId || !questionType || order === undefined ||
        questionNumberStart === undefined || questionNumberEnd === undefined) {
      return NextResponse.json(
        { message: "sectionId, testId, questionType, order, questionNumberStart, questionNumberEnd are required" },
        { status: 400 }
      );
    }

    const group = await QuestionGroup.create(body);
    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
