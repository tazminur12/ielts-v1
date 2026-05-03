import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import { calculateOverallBand } from "@/lib/resultCalculation";
import mongoose from "mongoose";

function parseDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const moduleFilter = searchParams.get("module");
    const examType = searchParams.get("examType");
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    const filter: Record<string, any> = {
      userId: session.user.id,
      status: { $in: ["submitted", "evaluated"] },
    };

    if (moduleFilter) filter.module = moduleFilter;
    if (examType) filter.examType = examType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const attempts = await Attempt.find(filter)
      .populate("testId", "title module examType type")
      .sort({ createdAt: -1 })
      .limit(250)
      .lean();

    const deriveOverall = (a: any): number | null => {
      const direct = typeof a.overallBand === "number" ? a.overallBand : typeof a.bandScore === "number" ? a.bandScore : null;
      if (direct != null && Number.isFinite(direct)) return Math.max(0, Math.min(9, direct));
      const sb = a.sectionBands;
      if (!sb) return null;
      if ([sb.listening, sb.reading, sb.writing, sb.speaking].some((v: any) => typeof v !== "number")) return null;
      return calculateOverallBand({
        listening: sb.listening,
        reading: sb.reading,
        writing: sb.writing,
        speaking: sb.speaking,
      });
    };

    const evaluated = attempts.filter((a: any) => a.status === "evaluated");

    const trend = evaluated
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.submittedAt ?? a.createdAt).getTime() - new Date(b.submittedAt ?? b.createdAt).getTime()
      )
      .slice(-10)
      .map((a: any) => ({
        attemptId: String(a._id),
        date: new Date(a.submittedAt ?? a.createdAt).toISOString(),
        overall: deriveOverall(a) ?? null,
        listening: typeof a.sectionBands?.listening === "number" ? a.sectionBands.listening : a.module === "listening" ? a.bandScore : null,
        reading: typeof a.sectionBands?.reading === "number" ? a.sectionBands.reading : a.module === "reading" ? a.bandScore : null,
        writing: typeof a.sectionBands?.writing === "number" ? a.sectionBands.writing : a.module === "writing" ? a.overallBand ?? a.bandScore : null,
        speaking: typeof a.sectionBands?.speaking === "number" ? a.sectionBands.speaking : a.module === "speaking" ? a.overallBand ?? a.bandScore : null,
        module: a.module,
        examType: a.examType,
        title: a.testId?.title ?? "",
      }));

    const attemptIds = attempts.map((a: any) => a._id);
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    const questionTypeErrors = await Answer.aggregate([
      { $match: { userId: userObjectId, attemptId: { $in: attemptIds }, isCorrect: false } },
      { $group: { _id: "$questionType", wrong: { $sum: 1 } } },
      { $sort: { wrong: -1 } },
      { $limit: 10 },
    ]);

    const sectionAverages = (() => {
      const buckets: Record<string, number[]> = { listening: [], reading: [], writing: [], speaking: [] };
      for (const a of evaluated as any[]) {
        if (a.module === "full" && a.sectionBands) {
          for (const k of ["listening", "reading", "writing", "speaking"] as const) {
            const v = a.sectionBands?.[k];
            if (typeof v === "number" && Number.isFinite(v)) buckets[k].push(v);
          }
        } else {
          const b = typeof a.bandScore === "number" ? a.bandScore : typeof a.overallBand === "number" ? a.overallBand : null;
          if (b != null && buckets[a.module]) buckets[a.module].push(b);
        }
      }
      const avg = (vals: number[]) => {
        if (vals.length === 0) return null;
        return Math.round(((vals.reduce((s, v) => s + v, 0) / vals.length) * 2)) / 2;
      };
      return {
        listening: avg(buckets.listening),
        reading: avg(buckets.reading),
        writing: avg(buckets.writing),
        speaking: avg(buckets.speaking),
      };
    })();

    const weakestSection = (() => {
      const entries = Object.entries(sectionAverages)
        .filter(([, v]) => typeof v === "number")
        .sort((a, b) => (a[1] as number) - (b[1] as number));
      return entries[0]?.[0] ?? null;
    })();

    const recommendations = (() => {
      const out: string[] = [];
      if (weakestSection) {
        out.push(`Focus on improving ${weakestSection} first based on your recent averages.`);
      }
      const topWrong = (questionTypeErrors || []).slice(0, 3).map((r: any) => String(r._id));
      if (topWrong.length > 0) {
        out.push(`Practice these question types more: ${topWrong.join(", ")}.`);
      }
      out.push("Aim for accuracy first, then increase speed under timed conditions.");
      return out;
    })();

    return NextResponse.json({
      attempts,
      trend,
      sectionAverages,
      weakness: {
        weakestSection,
        questionTypeErrors,
        recommendations,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
