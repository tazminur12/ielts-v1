import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisGetJson, redisSetJson } from "@/lib/redisCache";
import { getCacheBuster } from "@/lib/cacheBusters";

function safeTierRank(p: { tierRank?: number; displayOrder?: number } | null | undefined): number {
  const tr = Number((p as any)?.tierRank);
  if (Number.isFinite(tr) && tr >= 1) return tr;
  // Backward compatibility: if tierRank wasn't set yet, fall back to displayOrder (at least deterministic).
  const d = Number((p as any)?.displayOrder);
  if (Number.isFinite(d) && d >= 1) return d;
  return 1;
}

// GET /api/tests  — public list of published tests (with access metadata)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType"); // "mock" | "practice"
    const moduleFilter = searchParams.get("module");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const filter: Record<string, unknown> = { status: "published" };
    if (examType) filter.examType = examType;
    if (moduleFilter) filter.module = moduleFilter;

    // Shared caches (read-heavy)
    const testsBuster = await getCacheBuster("tests");
    const activePlansKey = "ielts:plans:activeSlugs:v1";
    const plansMetaKey = "ielts:plans:meta:v1";
    const testsKey = `ielts:tests:list:v1:${testsBuster}:${examType || "all"}:${moduleFilter || "all"}:${page}:${limit}`;

    let activePlans = await redisGetJson<
      { slug: string; tierRank?: number; displayOrder?: number }[]
    >(activePlansKey);

    let plansBySlug = await redisGetJson<
      Record<string, { name: string; isPremium: boolean; displayOrder: number; tierRank: number }>
    >(plansMetaKey);

    let cachedList = await redisGetJson<{ tests: any[]; total: number }>(testsKey);

    const needsDb = !activePlans || !plansBySlug || !cachedList;
    if (needsDb) {
      await connectDB();
    }

    if (!activePlans) {
      activePlans = (await Plan.find({ isActive: true })
        .select("slug tierRank displayOrder")
        .lean()) as { slug: string; tierRank?: number; displayOrder?: number }[];
      await redisSetJson(activePlansKey, activePlans, 120);
    }

    if (session?.user?.id) {
      // user-specific entitlement cache (short TTL)
      const entKey = `ielts:entitlements:v1:${session.user.id}`;
      let accessibleSlugs = await redisGetJson<string[]>(entKey);

      if (!accessibleSlugs) {
        if (!needsDb) await connectDB();
        const subscription = (await Subscription.findOne({
          userId: session.user.id,
          status: { $in: ["active", "trial"] },
          endDate: { $gte: new Date() },
        })
          .populate({ path: "planId", select: "slug tierRank displayOrder" })
          .lean()) as { planId: { slug: string; tierRank?: number; displayOrder?: number } } | null;

        if (subscription?.planId) {
          const userTierRank = safeTierRank(subscription.planId);
          accessibleSlugs = activePlans
            .filter((p) => safeTierRank(p) <= userTierRank)
            .map((p) => p.slug);
        } else {
          accessibleSlugs = [];
        }

        await redisSetJson(entKey, accessibleSlugs, 120);
      }

      // If no accessible slugs (no subscription), fall back to lowest tier plan
      if (accessibleSlugs.length === 0) {
        const freeCandidate =
          activePlans
            .map((p) => ({ slug: p.slug, rank: safeTierRank(p) }))
            .sort((a, b) => a.rank - b.rank)[0]?.slug ?? "free";
        accessibleSlugs = [freeCandidate];
      }

      if (!plansBySlug) {
        const plans = (await Plan.find({ isActive: true })
          .select("slug name isPremium displayOrder tierRank")
          .lean()) as {
          slug: string;
          name: string;
          isPremium?: boolean;
          displayOrder?: number;
          tierRank?: number;
        }[];

        plansBySlug = plans.reduce<
          Record<
            string,
            { name: string; isPremium: boolean; displayOrder: number; tierRank: number }
          >
        >((acc, p) => {
          acc[p.slug] = {
            name: p.name,
            isPremium: Boolean(p.isPremium),
            displayOrder: Number(p.displayOrder ?? 0),
            tierRank: safeTierRank(p),
          };
          return acc;
        }, {});
        await redisSetJson(plansMetaKey, plansBySlug, 120);
      }

      if (!cachedList) {
        const [tests, total] = await Promise.all([
          Test.find(filter)
            .select("-createdBy")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          Test.countDocuments(filter),
        ]);
        cachedList = { tests, total };
        await redisSetJson(testsKey, cachedList, 120);
      }

      return withCacheHeaders(
        NextResponse.json({
          tests: cachedList.tests,
          pagination: {
            total: cachedList.total,
            page,
            limit,
            pages: Math.ceil(cachedList.total / limit),
          },
          accessibleSlugs,
          plansBySlug,
        }),
        { kind: "private-no-store" }
      );
    }

    // Guest: fall back to lowest tier plan (free)
    const freeCandidate =
      activePlans
        .map((p) => ({ slug: p.slug, rank: safeTierRank(p) }))
        .sort((a, b) => a.rank - b.rank)[0]?.slug ?? "free";

    if (!plansBySlug) {
      const plans = (await Plan.find({ isActive: true })
        .select("slug name isPremium displayOrder tierRank")
        .lean()) as {
        slug: string;
        name: string;
        isPremium?: boolean;
        displayOrder?: number;
        tierRank?: number;
      }[];

      plansBySlug = plans.reduce<
        Record<string, { name: string; isPremium: boolean; displayOrder: number; tierRank: number }>
      >((acc, p) => {
        acc[p.slug] = {
          name: p.name,
          isPremium: Boolean(p.isPremium),
          displayOrder: Number(p.displayOrder ?? 0),
          tierRank: safeTierRank(p),
        };
        return acc;
      }, {});
      await redisSetJson(plansMetaKey, plansBySlug, 120);
    }

    if (!cachedList) {
      const [tests, total] = await Promise.all([
        Test.find(filter)
          .select("-createdBy")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Test.countDocuments(filter),
      ]);
      cachedList = { tests, total };
      await redisSetJson(testsKey, cachedList, 120);
    }

    return withCacheHeaders(
      NextResponse.json({
        tests: cachedList.tests,
        pagination: {
          total: cachedList.total,
          page,
          limit,
          pages: Math.ceil(cachedList.total / limit),
        },
        accessibleSlugs: [freeCandidate],
        plansBySlug,
      }),
      { kind: "private-no-store" }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
