import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import { checkUserAccess, useFeature as consumeFeature } from "@/lib/accessControl";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const answerId = body?.answerId;
    if (!answerId) {
      return NextResponse.json({ message: "Missing answerId" }, { status: 400 });
    }

    const access = await checkUserAccess(session.user.id);
    if (!access?.features?.canGetWritingCorrection) {
      return NextResponse.json(
        { message: "Manual review is available for premium users only." },
        { status: 402 }
      );
    }

    await connectDB();

    const answer = await Answer.findOne({ _id: answerId, userId: session.user.id });
    if (!answer) return NextResponse.json({ message: "Answer not found" }, { status: 404 });

    if (answer.manualReviewRequestedAt) {
      return NextResponse.json({ ok: true });
    }

    const used = await consumeFeature(session.user.id, "writingCorrection");
    if (!used) {
      return NextResponse.json(
        { message: "No remaining manual review credits." },
        { status: 402 }
      );
    }

    answer.manualReviewRequestedAt = new Date();
    await answer.save();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
