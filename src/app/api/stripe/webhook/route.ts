import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";
import User from "@/models/User";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, planSlug, billingCycle } = session.metadata;

        // Get plan details
        const plan = await Plan.findOne({ slug: planSlug });
        if (!plan) {
          console.error("Plan not found:", planSlug);
          break;
        }

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (billingCycle === "yearly") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Create subscription
        const subscription = await Subscription.create({
          userId,
          planId: plan._id,
          status: "active",
          startDate,
          endDate,
          paymentMethod: "card",
          transactionId: session.id,
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

        // Update user's current subscription
        await User.findByIdAndUpdate(userId, {
          currentSubscriptionId: subscription._id,
        });

        console.log("Subscription created:", subscription._id);
        break;
      }

      case "customer.subscription.updated": {
        // Handle subscription updates
        console.log("Subscription updated:", event.data.object.id);
        break;
      }

      case "customer.subscription.deleted": {
        // Handle subscription cancellation
        const stripeSubscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { transactionId: stripeSubscription.id },
          { status: "cancelled" }
        );
        console.log("Subscription cancelled:", stripeSubscription.id);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
