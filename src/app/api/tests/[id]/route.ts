import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import Question from "@/models/Question";

// GET /api/tests/[id]  — full test with sections, groups, questions (NO correct answers)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Please login to access tests" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const test = await Test.findOne({ _id: id, status: "published" })
      .select("-createdBy")
      .lean();

    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    const sections = await Section.find({ testId: id })
      .select("-audioTranscript") // Don't leak transcripts
      .sort({ order: 1 })
      .lean();

    const sectionIds = sections.map((s) => s._id);

    const [groups, questions] = await Promise.all([
      QuestionGroup.find({ sectionId: { $in: sectionIds } })
        .sort({ order: 1 })
        .lean(),
      // Explicitly exclude correct answers and explanations for students
      Question.find({ testId: id })
        .select("-correctAnswer -explanation")
        .sort({ questionNumber: 1 })
        .lean(),
    ]);

    return NextResponse.json({ test, sections, groups, questions });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
