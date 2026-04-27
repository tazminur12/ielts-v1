import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

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
    await connectDB();

    const { searchParams } = new URL(req.url);
    const examType = searchParams.get("examType"); // "mock" | "practice"
    const moduleFilter = searchParams.get("module");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const filter: Record<string, unknown> = { status: "published" };
    if (examType) filter.examType = examType;
    if (moduleFilter) filter.module = moduleFilter;

    // Determine which plan slugs this user can access
    let accessibleSlugs: string[] = [];

    const activePlans = (await Plan.find({ isActive: true })
      .select("slug tierRank displayOrder")
      .lean()) as { slug: string; tierRank?: number; displayOrder?: number }[];

    if (session?.user?.id) {
      // Find user's active subscription and its plan
      const subscription = await Subscription.findOne({
        userId: session.user.id,
        status: { $in: ["active", "trial"] },
        endDate: { $gte: new Date() },
      })
        .populate({ path: "planId", select: "slug tierRank displayOrder" })
        .lean() as { planId: { slug: string; tierRank?: number; displayOrder?: number } } | null;

      if (subscription?.planId) {
        const userTierRank = safeTierRank(subscription.planId);

        // Real-world rule: higher tierRank includes all lower tierRank plans.
        // Backward compatible: if tierRank isn't set on existing plans yet, fall back to displayOrder.
        accessibleSlugs = activePlans
          .filter((p) => safeTierRank(p) <= userTierRank)
          .map((p) => p.slug);
      }
    }

    // If no accessible slugs (not logged in or no subscription),
    // access falls back to tierRank=1 plan ("free" tier)
    if (accessibleSlugs.length === 0) {
      const freeCandidate =
        activePlans
          .map((p) => ({ slug: p.slug, rank: safeTierRank(p) }))
          .sort((a, b) => a.rank - b.rank)[0]?.slug ?? "free";
      accessibleSlugs = [freeCandidate];
    }

    const plans = (await Plan.find({ isActive: true })
      .select("slug name isPremium displayOrder tierRank")
      .lean()) as {
      slug: string;
      name: string;
      isPremium?: boolean;
      displayOrder?: number;
      tierRank?: number;
    }[];

    const plansBySlug = plans.reduce<
      Record<string, { name: string; isPremium: boolean; displayOrder: number; tierRank: number }>
    >(
      (acc, p) => {
        acc[p.slug] = {
          name: p.name,
          isPremium: Boolean(p.isPremium),
          displayOrder: Number(p.displayOrder ?? 0),
          tierRank: safeTierRank(p),
        };
        return acc;
      },
      {}
    );

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .select("-createdBy")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Test.countDocuments(filter),
    ]);

    return NextResponse.json({
      tests,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      accessibleSlugs, // send to client so it can show lock/unlock correctly
      plansBySlug,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
