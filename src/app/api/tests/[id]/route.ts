import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import Question from "@/models/Question";
import Plan from "@/models/Plan";
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
      // Guests can only load tests available on the lowest (free) plan.
      if (!session) {
        const freeSlugKey = "ielts:plans:freeSlug:v1";
        let freeSlug = await redisGetJson<string>(freeSlugKey);
        if (!freeSlug) {
          await connectDB();
          const freePlan = (await Plan.findOne({ isActive: true })
            .sort({ displayOrder: 1 })
            .select("slug")
            .lean()) as { slug: string } | null;
          freeSlug = freePlan?.slug ?? "free";
          await redisSetJson(freeSlugKey, freeSlug, 300);
        }

        if (String(cached.test.accessLevel) !== String(freeSlug)) {
          return NextResponse.json(
            { message: "Please login to access this test" },
            { status: 401 }
          );
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

    // Guests can only load tests available on the lowest (free) plan.
    if (!session) {
      const freeSlugKey = "ielts:plans:freeSlug:v1";
      let freeSlug = await redisGetJson<string>(freeSlugKey);
      if (!freeSlug) {
        const freePlan = (await Plan.findOne({ isActive: true })
          .sort({ displayOrder: 1 })
          .select("slug")
          .lean()) as { slug: string } | null;
        freeSlug = freePlan?.slug ?? "free";
        await redisSetJson(freeSlugKey, freeSlug, 300);
      }
      if (String(test.accessLevel) !== String(freeSlug)) {
        return NextResponse.json({ message: "Please login to access this test" }, { status: 401 });
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
