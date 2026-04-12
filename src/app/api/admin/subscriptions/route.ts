import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import {
  repairStripePaidTrialsStillMarkedTrial,
  syncExpiredSubscriptions,
} from "@/lib/subscriptionSync";

// GET all subscriptions (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or super-admin
    if (session.user.role !== "admin" && session.user.role !== "super-admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();
    await repairStripePaidTrialsStillMarkedTrial();
    await syncExpiredSubscriptions();

    const subscriptions = await Subscription.find()
      .populate("userId", "name email")
      .populate("planId", "name slug price")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
