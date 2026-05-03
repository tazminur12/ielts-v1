import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import Section from "@/models/Section";
import { redisGetJson, redisSetJson } from "@/lib/redisCache";
import { getGuestId } from "@/lib/guestSession";

type ResultPayload = {
  attempt: any;
  answers: any[];
  questions: any[];
  sections: any[];
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { attemptId } = await params;

    if (!attemptId) return NextResponse.json({ message: "attemptId is required" }, { status: 400 });

    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const actorKey = session?.user?.id ? `u:${session.user.id}` : `g:${guestId}`;
    const cacheKey = `result:${actorKey}:${attemptId}`;

    const cached = await redisGetJson<ResultPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();

    const attempt = await Attempt.findOne(
      session?.user?.id ? { _id: attemptId, userId: session.user.id } : { _id: attemptId, guestId }
    )
      .populate("testId", "title module examType type duration totalQuestions accessLevel")
      .lean();

    if (!attempt) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const answers = await Answer.find(session?.user?.id ? { attemptId, userId: session.user.id } : { attemptId, guestId })
      .populate("questionId", "questionText questionType options speakingPrompt speakingDuration sectionId skill")
      .lean();

    const [questions, sections] = await Promise.all([
      Question.find({ testId: attempt.testId }).select("+correctAnswer").lean(),
      Section.find({ testId: attempt.testId }).lean(),
    ]);

    const payload: ResultPayload = { attempt, answers, questions, sections };

    if (attempt.status === "evaluated") {
      await redisSetJson(cacheKey, payload, 60 * 60 * 24 * 7);
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
