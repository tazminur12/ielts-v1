import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

// DELETE subscription (Cancel - Admin only)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Update subscription status to cancelled
    subscription.status = "cancelled";
    await subscription.save();

    // Remove from user's currentSubscriptionId if it matches
    await User.findByIdAndUpdate(subscription.userId, {
      $unset: { currentSubscriptionId: "" },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
