import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

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

    if (session?.user?.id) {
      // Find user's active subscription and its plan
      const subscription = await Subscription.findOne({
        userId: session.user.id,
        status: { $in: ["active", "trial"] },
        endDate: { $gte: new Date() },
      })
        .populate("planId")
        .lean() as { planId: { slug: string; displayOrder: number } } | null;

      if (subscription?.planId) {
        const userPlanOrder = subscription.planId.displayOrder;
        // User can access tests of their plan and all lower-order plans
        const accessiblePlans = await Plan.find({
          isActive: true,
          displayOrder: { $lte: userPlanOrder },
        })
          .select("slug")
          .lean() as { slug: string }[];
        accessibleSlugs = accessiblePlans.map((p) => p.slug);
      }
    }

    // If no accessible slugs (not logged in or no subscription),
    // access falls back to the lowest-order plan (free)
    if (accessibleSlugs.length === 0) {
      const freePlan = await Plan.findOne({ isActive: true })
        .sort({ displayOrder: 1 })
        .select("slug")
        .lean() as { slug: string } | null;
      accessibleSlugs = freePlan ? [freePlan.slug] : ["free"];
    }

    const plans = await Plan.find({ isActive: true })
      .select("slug name isPremium displayOrder")
      .lean() as { slug: string; name: string; isPremium?: boolean; displayOrder?: number }[];

    const plansBySlug = plans.reduce<Record<string, { name: string; isPremium: boolean; displayOrder: number }>>(
      (acc, p) => {
        acc[p.slug] = {
          name: p.name,
          isPremium: Boolean(p.isPremium),
          displayOrder: Number(p.displayOrder ?? 0),
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
