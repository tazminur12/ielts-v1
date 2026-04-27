import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { planSlug, billingCycle, planName, price } = await req.json();

    // Build base URL from the incoming request host.
    // Do NOT hardcode a deployment URL here (e.g. Vercel preview), otherwise Stripe will redirect users to the wrong domain.
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") || (String(host).includes("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planName,
              description: `${billingCycle === "yearly" ? "Annual" : "Monthly"} Subscription`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            recurring: {
              interval: billingCycle === "yearly" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planSlug}&billing=${billingCycle}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        userId: session.user.id,
        planSlug,
        billingCycle,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
