import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Answer from "@/models/Answer";
import { calculateOverallWritingBand, uniqueSuggestions } from "@/lib/writingEvaluation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    await connectDB();

    const body = await req.json();
    const taskAchievement = Number(body?.taskAchievement);
    const coherenceCohesion = Number(body?.coherenceCohesion);
    const lexicalResource = Number(body?.lexicalResource);
    const grammaticalRange = Number(body?.grammaticalRange);
    const examinerNotes = typeof body?.examinerNotes === "string" ? body.examinerNotes.trim() : "";
    const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : "";
    const incomingSuggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];

    const scores = [taskAchievement, coherenceCohesion, lexicalResource, grammaticalRange];
    if (scores.some((s) => !Number.isFinite(s))) {
      return NextResponse.json({ message: "Invalid scores" }, { status: 400 });
    }

    const overallBand = calculateOverallWritingBand(scores);
    const suggestions = uniqueSuggestions(
      incomingSuggestions.filter((v: unknown) => typeof v === "string") as string[]
    );

    const updated = await Answer.findByIdAndUpdate(
      id,
      {
        $set: {
          writingEvaluation: {
            taskAchievement,
            coherenceCohesion,
            lexicalResource,
            grammaticalRange,
            overallBand,
            feedback,
            suggestions,
            evaluatedAt: new Date(),
            evaluatedBy: "manual",
            examinerNotes,
          },
        },
        $unset: {
          manualReviewRequestedAt: "",
        },
      },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

