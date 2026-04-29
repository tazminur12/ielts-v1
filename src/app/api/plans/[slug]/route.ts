import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import { withCacheHeaders } from "@/lib/httpCache";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redisCache";

function isSuperAdmin(session: any) {
  return session?.user?.role === "super-admin";
}

// GET single plan
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const cacheKey = `ielts:plans:bySlug:v1:${slug}`;
    const cached = await redisGetJson<any>(cacheKey);
    if (cached) {
      return withCacheHeaders(NextResponse.json({ success: true, data: cached }), {
        kind: "public",
        sMaxAge: 60,
        swr: 600,
      });
    }

    await dbConnect();
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

    await redisSetJson(cacheKey, plan, 120);
    return withCacheHeaders(NextResponse.json({ success: true, data: plan }), {
      kind: "public",
      sMaxAge: 60,
      swr: 600,
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
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

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

    await Promise.all([
      redisDelete("ielts:plans:active:v1"),
      redisDelete("ielts:plans:meta:v1"),
      redisDelete(`ielts:plans:bySlug:v1:${slug}`),
    ]);

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
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { slug } = await context.params;

    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";

    if (hard) {
      const planDoc = await Plan.findOne({ slug }).select("_id").lean();
      if (!planDoc?._id) {
        return NextResponse.json(
          { success: false, error: "Plan not found" },
          { status: 404 }
        );
      }

      const usedBySubscription = await Subscription.exists({ planId: planDoc._id });
      if (usedBySubscription) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This plan has subscriptions. Archive it instead (deactivate) or migrate subscriptions first.",
          },
          { status: 409 }
        );
      }

      await Plan.deleteOne({ _id: planDoc._id });
      await Promise.all([
        redisDelete("ielts:plans:active:v1"),
        redisDelete("ielts:plans:meta:v1"),
        redisDelete(`ielts:plans:bySlug:v1:${slug}`),
      ]);
      return NextResponse.json({ success: true, message: "Plan permanently deleted" });
    }

    // Soft delete (archive) by setting isActive to false
    const plan = await Plan.findOneAndUpdate({ slug }, { $set: { isActive: false } }, { new: true });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
        },
        { status: 404 }
      );
    }

    await Promise.all([
      redisDelete("ielts:plans:active:v1"),
      redisDelete("ielts:plans:meta:v1"),
      redisDelete(`ielts:plans:bySlug:v1:${slug}`),
    ]);

    return NextResponse.json({
      success: true,
      message: "Plan archived successfully",
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
