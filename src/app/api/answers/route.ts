import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";

// POST /api/answers  — save or update a single answer during exam
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { attemptId, questionId, questionNumber, questionType } = body;

    if (!attemptId || !questionId || questionNumber === undefined || !questionType) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Verify the attempt belongs to this user
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: session.user.id,
      status: "in_progress",
    });
    if (!attempt) {
      return NextResponse.json({ message: "Active attempt not found" }, { status: 404 });
    }

    // Upsert answer (student can change answer before submit)
    const answer = await Answer.findOneAndUpdate(
      { attemptId, questionId },
      {
        $set: {
          ...body,
          userId: session.user.id,
          testId: attempt.testId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(answer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// GET /api/answers?attemptId=xxx  — get all answers for an attempt
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const attemptId = new URL(req.url).searchParams.get("attemptId");
    if (!attemptId) return NextResponse.json({ message: "attemptId is required" }, { status: 400 });

    const answers = await Answer.find({
      attemptId,
      userId: session.user.id,
    }).lean();

    return NextResponse.json(answers);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
