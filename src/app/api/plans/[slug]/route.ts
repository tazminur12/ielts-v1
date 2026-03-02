import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Plan from "@/models/Plan";

// GET single plan
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await context.params;

    const plan = await Plan.findOne({ slug, isActive: true }).lean();

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch plan",
      },
      { status: 500 }
    );
  }
}

// PUT update plan (admin only)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await context.params;

    const body = await req.json();

    const plan = await Plan.findOneAndUpdate(
      { slug },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update plan",
      },
      { status: 500 }
    );
  }
}

// DELETE plan (admin only)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await context.params;

    // Soft delete by setting isActive to false
    const plan = await Plan.findOneAndUpdate(
      { slug },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete plan",
      },
      { status: 500 }
    );
  }
}
