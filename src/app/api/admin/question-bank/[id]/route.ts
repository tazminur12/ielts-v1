import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import QuestionBank from "@/models/QuestionBank";
import Question from "@/models/Question";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const question = await QuestionBank.findById(id);
    if (!question || question.isDeleted) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if question is used in any published test
    const usedInPublished = await Question.exists({
      questionBankId: id,
    }).populate({
      path: "testId",
      match: { status: "published" },
    });

    if (usedInPublished) {
      // Create a new version instead of editing
      const newQuestion = await QuestionBank.create({
        ...question.toObject(),
        _id: undefined,
        version: (question.version || 1) + 1,
        parentQuestionId: question._id,
        ...body,
        createdBy: session.user.id,
      });

      return NextResponse.json({
        question: newQuestion,
        message: "New version created because question is used in published tests",
      });
    }

    // Update directly if not used in published tests
    const updatedQuestion = await QuestionBank.findByIdAndUpdate(
      id,
      { ...body },
      { new: true }
    );

    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error("Question bank PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const question = await QuestionBank.findById(id);
    if (!question || question.isDeleted) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if question is used in any published test
    const usedInPublished = await Question.exists({
      questionBankId: id,
    }).populate({
      path: "testId",
      match: { status: "published" },
    });

    if (usedInPublished) {
      return NextResponse.json(
        { error: "Cannot delete question: used in published tests" },
        { status: 400 }
      );
    }

    // Soft delete
    question.isDeleted = true;
    await question.save();

    return NextResponse.json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Question bank DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
