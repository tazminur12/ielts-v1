import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Plan from "@/models/Plan";

// GET all active plans
export async function GET() {
  try {
    await dbConnect();

    const plans = await Plan.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

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
    await dbConnect();

    const body = await req.json();
    const {
      name,
      slug,
      description,
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
      price,
      features,
      displayOrder: displayOrder || 0,
      trialDays: trialDays || 0,
      isPremium: isPremium || false,
    });

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
