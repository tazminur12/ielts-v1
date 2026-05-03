import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import Question from "@/models/Question";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisGetJson, redisSetJson } from "@/lib/redisCache";
import { getCacheBuster } from "@/lib/cacheBusters";

// GET /api/tests/[id]  — full test with sections, groups, questions (NO correct answers)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const testsBuster = await getCacheBuster("tests");
    const cacheKey = `ielts:tests:full:v1:${testsBuster}:${id}`;
    const cached = await redisGetJson<{
      test: any;
      sections: any[];
      groups: any[];
      questions: any[];
    }>(cacheKey);

    if (cached?.test) {
      if (!session) {
        if (String(cached.test.accessLevel) !== "free") {
          return NextResponse.json({ message: "Please login to access this test" }, { status: 401 });
        }
      } else if (session.user?.id) {
        const entKey = `ielts:entitlements:v1:${session.user.id}`;
        let accessibleSlugs = await redisGetJson<string[]>(entKey);
        if (!accessibleSlugs) {
          await connectDB();
          const [activePlans, subscription] = await Promise.all([
            Plan.find({ isActive: true }).select("slug tierRank displayOrder").lean(),
            Subscription.findOne({
              userId: session.user.id,
              status: { $in: ["active", "trial"] },
              endDate: { $gte: new Date() },
            })
              .populate({ path: "planId", select: "slug tierRank displayOrder" })
              .lean() as any,
          ]);

          const safeTierRank = (p: { tierRank?: number; displayOrder?: number } | null | undefined): number => {
            const tr = Number((p as any)?.tierRank);
            if (Number.isFinite(tr) && tr >= 1) return tr;
            const d = Number((p as any)?.displayOrder);
            if (Number.isFinite(d) && d >= 1) return d;
            return 1;
          };

          if (subscription?.planId) {
            const userTierRank = safeTierRank(subscription.planId);
            accessibleSlugs = (activePlans as any[])
              .filter((p) => safeTierRank(p) <= userTierRank)
              .map((p) => String(p.slug));
          } else {
            accessibleSlugs = [];
          }
          if (!accessibleSlugs.includes("free")) accessibleSlugs = ["free", ...accessibleSlugs];
          if (accessibleSlugs.length === 0) accessibleSlugs = ["free"];
          await redisSetJson(entKey, accessibleSlugs, 120);
        } else if (!accessibleSlugs.includes("free")) {
          accessibleSlugs = ["free", ...accessibleSlugs];
        }

        if (!accessibleSlugs.includes(String(cached.test.accessLevel))) {
          return NextResponse.json({ message: "Upgrade required" }, { status: 403 });
        }
      }

      return withCacheHeaders(NextResponse.json(cached), { kind: "private-no-store" });
    }

    await connectDB();

    const test = await Test.findOne({ _id: id, status: "published" })
      .select("-createdBy")
      .lean();

    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    if (!session) {
      if (String(test.accessLevel) !== "free") {
        return NextResponse.json({ message: "Please login to access this test" }, { status: 401 });
      }
    } else if (session.user?.id) {
      const entKey = `ielts:entitlements:v1:${session.user.id}`;
      let accessibleSlugs = await redisGetJson<string[]>(entKey);
      if (!accessibleSlugs) {
        const [activePlans, subscription] = await Promise.all([
          Plan.find({ isActive: true }).select("slug tierRank displayOrder").lean(),
          Subscription.findOne({
            userId: session.user.id,
            status: { $in: ["active", "trial"] },
            endDate: { $gte: new Date() },
          })
            .populate({ path: "planId", select: "slug tierRank displayOrder" })
            .lean() as any,
        ]);

        const safeTierRank = (p: { tierRank?: number; displayOrder?: number } | null | undefined): number => {
          const tr = Number((p as any)?.tierRank);
          if (Number.isFinite(tr) && tr >= 1) return tr;
          const d = Number((p as any)?.displayOrder);
          if (Number.isFinite(d) && d >= 1) return d;
          return 1;
        };

        if (subscription?.planId) {
          const userTierRank = safeTierRank(subscription.planId);
          accessibleSlugs = (activePlans as any[])
            .filter((p) => safeTierRank(p) <= userTierRank)
            .map((p) => String(p.slug));
        } else {
          accessibleSlugs = [];
        }
        if (!accessibleSlugs.includes("free")) accessibleSlugs = ["free", ...accessibleSlugs];
        if (accessibleSlugs.length === 0) accessibleSlugs = ["free"];
        await redisSetJson(entKey, accessibleSlugs, 120);
      } else if (!accessibleSlugs.includes("free")) {
        accessibleSlugs = ["free", ...accessibleSlugs];
      }

      if (!accessibleSlugs.includes(String(test.accessLevel))) {
        return NextResponse.json({ message: "Upgrade required" }, { status: 403 });
      }
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

    const payload = { test, sections, groups, questions };
    await redisSetJson(cacheKey, payload, 120);
    return withCacheHeaders(NextResponse.json(payload), { kind: "private-no-store" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
