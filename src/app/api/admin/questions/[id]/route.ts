import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Question from "@/models/Question";
import Test from "@/models/Test";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/questions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;

    const question = await Question.findById(id)
      .select("+correctAnswer +explanation")
      .lean();

    if (!question) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(question);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/questions/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const question = await Question.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select("+correctAnswer +explanation");

    if (!question) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(question);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/questions/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;

    const question = await Question.findByIdAndDelete(id);
    if (!question) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Recalculate totalQuestions on the parent test
    const count = await Question.countDocuments({ testId: question.testId });
    await Test.findByIdAndUpdate(question.testId, { totalQuestions: count });

    return NextResponse.json({ message: "Question deleted" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
