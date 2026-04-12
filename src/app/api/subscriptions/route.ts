import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";
import User from "@/models/User";
import {
  repairStripePaidTrialsStillMarkedTrial,
  syncExpiredSubscriptions,
} from "@/lib/subscriptionSync";

// GET user's subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await dbConnect();
    await repairStripePaidTrialsStillMarkedTrial();
    await syncExpiredSubscriptions();

    const subscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: new Date() },
    })
      .populate("planId")
      .lean();

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No active subscription found",
      });
    }

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch subscription",
      },
      { status: 500 }
    );
  }
}

// POST create subscription (subscribe to a plan)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const { planSlug, billingCycle, paymentMethod, transactionId } = body;

    console.log("Subscription request:", { planSlug, billingCycle, paymentMethod, transactionId, userId: session.user.id });

    if (transactionId) {
      const existingTxn = await Subscription.findOne({ transactionId });
      if (existingTxn) {
        await User.findByIdAndUpdate(session.user.id, {
          currentSubscriptionId: existingTxn._id,
        });
        return NextResponse.json(
          {
            success: true,
            data: existingTxn,
            message: "Subscription already recorded",
          },
          { status: 200 }
        );
      }
    }

    if (!planSlug || !billingCycle) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = await Plan.findOne({ slug: planSlug, isActive: true });
    console.log("Found plan:", plan ? plan.name : "Not found");
    
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found or inactive",
        },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: new Date() },
    });

    console.log("Existing subscription:", existingSubscription ? "Found" : "None");

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have an active subscription. Please cancel it first.",
        },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const paidStripeCheckout =
      Boolean(transactionId) &&
      paymentMethod === "card" &&
      String(transactionId).startsWith("cs_");

    /** Trial only when plan offers trial AND this is not a paid Stripe checkout (e.g. card trial signup without payment path). */
    const useTrialPeriod = plan.trialDays > 0 && !paidStripeCheckout;

    const billingEnd = new Date(startDate);
    if (billingCycle === "monthly") {
      billingEnd.setMonth(billingEnd.getMonth() + 1);
    } else if (billingCycle === "yearly") {
      billingEnd.setFullYear(billingEnd.getFullYear() + 1);
    }

    const trialEnd = new Date(
      startDate.getTime() + plan.trialDays * 24 * 60 * 60 * 1000
    );

    const endDate = useTrialPeriod ? trialEnd : billingEnd;
    const status = useTrialPeriod ? "trial" : "active";

    // Create subscription
    const subscription = await Subscription.create({
      userId: session.user.id,
      planId: plan._id,
      status,
      startDate,
      endDate,
      billingCycle: billingCycle as "monthly" | "yearly",
      paymentMethod,
      transactionId,
      features: {
        mockTests: plan.features.mockTests,
        mockTestsUsed: 0,
        speakingEvaluations: plan.features.speakingEvaluations,
        speakingEvaluationsUsed: 0,
        writingCorrections: plan.features.writingCorrections,
        writingCorrectionsUsed: 0,
        hasAnalytics: plan.features.hasAnalytics,
        hasPersonalizedPlan: plan.features.hasPersonalizedPlan,
        hasPrioritySupport: plan.features.hasPrioritySupport,
        has1on1Coaching: plan.features.has1on1Coaching,
      },
    });

    await User.findByIdAndUpdate(session.user.id, {
      currentSubscriptionId: subscription._id,
    });

    return NextResponse.json(
      {
        success: true,
        data: subscription,
        message: "Subscription created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create subscription",
      },
      { status: 500 }
    );
  }
}

// PUT update subscription (upgrade/downgrade)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await dbConnect();
    await repairStripePaidTrialsStillMarkedTrial();
    await syncExpiredSubscriptions();

    const body = await req.json();
    const { action } = body; // 'cancel', 'renew', 'upgrade'

    const subscription = await Subscription.findOne({
      userId: session.user.id,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: new Date() },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: "No active subscription found",
        },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      subscription.status = "cancelled";
      subscription.autoRenew = false;
      await subscription.save();

      await User.findByIdAndUpdate(session.user.id, {
        $unset: { currentSubscriptionId: 1 },
      });

      return NextResponse.json({
        success: true,
        message: "Subscription cancelled successfully",
      });
    }

    if (action === "renew") {
      subscription.autoRenew = true;
      await subscription.save();

      return NextResponse.json({
        success: true,
        message: "Auto-renew enabled",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update subscription",
      },
      { status: 500 }
    );
  }
}
