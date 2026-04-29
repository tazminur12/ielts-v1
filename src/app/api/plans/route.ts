import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Plan from "@/models/Plan";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redisCache";

// GET all active plans
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "1";

    if (includeInactive) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.role || !["super-admin", "admin"].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      await dbConnect();
      const plans = await Plan.find({}).sort({ displayOrder: 1 }).lean();
      return withCacheHeaders(
        NextResponse.json({ success: true, data: plans }),
        { kind: "private-no-store" }
      );
    }

    const cacheKey = "ielts:plans:active:v1";
    const cached = await redisGetJson<any[]>(cacheKey);
    if (cached) {
      return withCacheHeaders(NextResponse.json({ success: true, data: cached }), {
        kind: "public",
        sMaxAge: 60,
        swr: 600,
      });
    }

    await dbConnect();
    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    await redisSetJson(cacheKey, plans, 120);

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch plans",
      },
      { status: 500 }
    );
  }
}

// POST create a new plan (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const {
      name,
      slug,
      description,
      tierRank,
      price,
      features,
      displayOrder,
      trialDays,
      isPremium,
    } = body;

    // Validation
    if (!name || !slug || !description || !price) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    const normalizedTierRank = Number(tierRank ?? 1);
    if (!Number.isFinite(normalizedTierRank) || normalizedTierRank < 1) {
      return NextResponse.json(
        { success: false, error: "tierRank must be a number >= 1" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingPlan = await Plan.findOne({ slug });
    if (existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan with this slug already exists",
        },
        { status: 400 }
      );
    }

    const plan = await Plan.create({
      name,
      slug,
      description,
      tierRank: normalizedTierRank,
      price,
      features,
      displayOrder: displayOrder || 0,
      trialDays: trialDays || 0,
      isPremium: isPremium || false,
    });

    await Promise.all([
      redisDelete("ielts:plans:active:v1"),
      redisDelete("ielts:plans:meta:v1"),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: plan,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create plan",
      },
      { status: 500 }
    );
  }
}
