import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Test from "@/models/Test";
import Question from "@/models/Question";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin"].includes(session.user?.role as string)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const start7d = new Date(startOfToday);
    start7d.setDate(start7d.getDate() - 7);

    const start30d = new Date(startOfToday);
    start30d.setDate(start30d.getDate() - 30);

    const totalUsers = await User.countDocuments({ role: "student" });

    const [attemptsWeek, attemptsMonth] = await Promise.all([
      Attempt.countDocuments({ createdAt: { $gte: start7d } }),
      Attempt.countDocuments({ createdAt: { $gte: start30d } }),
    ]);

    const evaluatedWeek = await Attempt.countDocuments({
      createdAt: { $gte: start7d },
      status: "evaluated",
    });
    const evaluatedMonth = await Attempt.countDocuments({
      createdAt: { $gte: start30d },
      status: "evaluated",
    });

    const activeUsers7dAgg = await Attempt.aggregate([
      { $match: { createdAt: { $gte: start7d }, userId: { $exists: true } } },
      { $group: { _id: "$userId" } },
      { $count: "count" },
    ]);
    const activeUsers7d = activeUsers7dAgg[0]?.count ?? 0;

    const avgBandPerTestAgg = await Attempt.aggregate([
      { $match: { status: "evaluated", testId: { $exists: true }, $or: [{ overallBand: { $exists: true } }, { bandScore: { $exists: true } }] } },
      { $group: { _id: "$testId", avgBand: { $avg: { $ifNull: ["$overallBand", "$bandScore"] } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const testIds = avgBandPerTestAgg.map((r: any) => r._id);
    const tests = await Test.find({ _id: { $in: testIds } }).select("title module examType").lean();
    const testById = new Map<string, any>(tests.map((t: any) => [String(t._id), t]));

    const averageBandPerTest = avgBandPerTestAgg.map((r: any) => ({
      testId: String(r._id),
      title: testById.get(String(r._id))?.title ?? "Unknown test",
      module: testById.get(String(r._id))?.module ?? "",
      examType: testById.get(String(r._id))?.examType ?? "",
      avgBand: Math.round((Number(r.avgBand) || 0) * 2) / 2,
      attempts: r.count,
    }));

    const mostAttemptedAgg = await Attempt.aggregate([
      { $match: { testId: { $exists: true } } },
      { $group: { _id: "$testId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const mostAttemptedTests = mostAttemptedAgg.map((r: any) => ({
      testId: String(r._id),
      title: testById.get(String(r._id))?.title ?? "Unknown test",
      count: r.count,
    }));

    const questionErrorAgg = await Answer.aggregate([
      { $match: { isCorrect: false, questionId: { $exists: true } } },
      { $group: { _id: "$questionId", wrong: { $sum: 1 } } },
      { $sort: { wrong: -1 } },
      { $limit: 15 },
    ]);

    const questionIds = questionErrorAgg.map((r: any) => r._id);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select("questionNumber questionText questionType")
      .lean();
    const qById = new Map<string, any>(questions.map((q: any) => [String(q._id), q]));

    const questionErrors = questionErrorAgg.map((r: any) => ({
      questionId: String(r._id),
      questionNumber: qById.get(String(r._id))?.questionNumber,
      questionType: qById.get(String(r._id))?.questionType,
      questionText: qById.get(String(r._id))?.questionText,
      wrong: r.wrong,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          totalUsers,
          attemptsWeek,
          attemptsMonth,
        },
        engagement: {
          activeUsers7d,
          completionRate7d: attemptsWeek > 0 ? Math.round((evaluatedWeek / attemptsWeek) * 100) : 0,
          completionRate30d: attemptsMonth > 0 ? Math.round((evaluatedMonth / attemptsMonth) * 100) : 0,
        },
        averageBandPerTest,
        mostAttemptedTests,
        questionErrors,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
