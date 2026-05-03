import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import Question from "@/models/Question";
import { bumpCacheBuster } from "@/lib/cacheBusters";
import { validateIeltsParityByTestId } from "@/lib/ieltsParity";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/tests/[id]
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

    const test = await Test.findById(id).populate("createdBy", "name email").lean();
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    // Fetch sections with their groups and questions
    const sections = await Section.find({ testId: id }).sort({ order: 1 }).lean();
    const sectionIds = sections.map((s) => s._id);

    const [groups, questions] = await Promise.all([
      QuestionGroup.find({ sectionId: { $in: sectionIds } }).sort({ order: 1 }).lean(),
      Question.find({ testId: id }).select("+correctAnswer +explanation").sort({ questionNumber: 1 }).lean(),
    ]);

    return NextResponse.json({ test, sections, groups, questions });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/tests/[id] — update test details or publish/draft
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

    // Prevent changing examType/module after creation (breaking change)
    delete body.examType;
    delete body.slug;

    if (body.status === "published") {
      const r = await validateIeltsParityByTestId(id);
      if (!r.ok) {
        return NextResponse.json(
          { message: "IELTS parity validation failed", errors: r.errors, warnings: r.warnings },
          { status: 400 }
        );
      }
    }

    const test = await Test.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    await bumpCacheBuster("tests");
    return NextResponse.json(test);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/tests/[id] — delete test and all related data
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    // Cascade delete
    await Promise.all([
      Test.findByIdAndDelete(id),
      Section.deleteMany({ testId: id }),
      QuestionGroup.deleteMany({ testId: id }),
      Question.deleteMany({ testId: id }),
    ]);

    await bumpCacheBuster("tests");
    return NextResponse.json({ message: "Test deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
