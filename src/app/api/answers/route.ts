import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import Attempt from "@/models/Attempt";
import { getGuestId } from "@/lib/guestSession";

// POST /api/answers  — save or update a single answer during exam
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    const body = await req.json();
    const { attemptId, questionId, questionNumber, questionType } = body;

    if (!attemptId || !questionId || questionNumber === undefined || !questionType) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify the attempt belongs to this actor
    const attemptFilter: Record<string, unknown> = { _id: attemptId, status: "in_progress" };
    if (session?.user?.id) attemptFilter.userId = session.user.id;
    else attemptFilter.guestId = guestId;

    const attempt = await Attempt.findOne(attemptFilter);
    if (!attempt) {
      return NextResponse.json({ message: "Active attempt not found" }, { status: 404 });
    }

    // Upsert answer (student can change answer before submit)
    const identity: Record<string, unknown> = session?.user?.id
      ? { userId: session.user.id }
      : { guestId };

    const answer = await Answer.findOneAndUpdate(
      { attemptId, questionId },
      {
        $set: {
          ...body,
          ...identity,
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
    await connectDB();
    const attemptId = new URL(req.url).searchParams.get("attemptId");
    if (!attemptId) return NextResponse.json({ message: "attemptId is required" }, { status: 400 });

    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure attempt belongs to actor
    const attemptFilter: Record<string, unknown> = { _id: attemptId };
    if (session?.user?.id) attemptFilter.userId = session.user.id;
    else attemptFilter.guestId = guestId;
    const attempt = await Attempt.findOne(attemptFilter).lean();
    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const answers = await Answer.find({
      attemptId,
      ...(session?.user?.id ? { userId: session.user.id } : { guestId }),
    }).lean();

    return NextResponse.json(answers);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
