import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import QuestionBank from "@/models/QuestionBank";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  await connectDB();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const moduleFilter = searchParams.get("module");
    const questionType = searchParams.get("questionType");
    const difficulty = searchParams.get("difficulty");
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const filters: any = { isDeleted: false };
    if (moduleFilter) filters.module = moduleFilter;
    if (questionType) filters.questionType = questionType;
    if (difficulty) filters.difficulty = difficulty;
    if (topic) filters.topic = topic;
    if (search) {
      filters.$or = [
        { questionText: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (page - 1) * limit;
    const questions = await QuestionBank.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuestionBank.countDocuments(filters);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Question bank GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions from bank" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const question = await QuestionBank.create({
      ...body,
      createdBy: session.user.id,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Question bank POST error:", error);
    return NextResponse.json(
      { error: "Failed to add question to bank" },
      { status: 500 }
    );
  }
}
