import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const submissions = await Answer.find({
      manualReviewRequestedAt: { $exists: true },
      textAnswer: { $exists: true, $ne: "" },
      $or: [
        { "writingEvaluation.evaluatedBy": { $ne: "manual" } },
        { writingEvaluation: { $exists: false } },
      ],
    })
      .populate("userId", "name email")
      .populate("questionId", "questionText questionNumber")
      .sort({ manualReviewRequestedAt: -1 })
      .lean();

    return NextResponse.json(submissions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

