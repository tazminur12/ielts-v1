"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, CheckCircle, CreditCard, Shield, Lock } from "lucide-react";
import Swal from "sweetalert2";
import Image from "next/image";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: any;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const planSlug = searchParams.get("plan");
  const billingCycle = searchParams.get("billing") || "monthly";

  const fetchPlan = async () => {
    try {
      const response = await fetch(`/api/plans/${planSlug}`);
      const data = await response.json();
      if (data.success) {
        setPlan(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Plan Not Found",
          text: "The selected plan could not be found.",
        });
        router.push("/pricing");
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load plan details.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?redirect=/checkout?plan=${planSlug}&billing=${billingCycle}`);
      return;
    }

    if (planSlug && status === "authenticated") {
      fetchPlan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSlug, status]);

  const handleCheckout = async () => {
    if (!plan) return;

    setProcessing(true);

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planSlug: plan.slug,
          billingCycle,
          planName: plan.name,
          price:
            billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text: error.message || "Something went wrong. Please try again.",
      });
      setProcessing(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const price = billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly;
  const totalPrice = billingCycle === "yearly" ? price * 12 : price;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Complete Your Purchase</h1>
          <p className="text-slate-600">Secure checkout powered by Stripe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">

          <div className="p-8">
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Plan Summary - 2 columns */}
              <div className="lg:col-span-2">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h2>
                <div className="bg-linear-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-slate-900">{plan.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{plan.description}</p>
                  </div>

                  <div className="space-y-3 py-4 border-y border-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Billing Cycle</span>
                      <span className="font-semibold text-slate-900 capitalize">{billingCycle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Price per month</span>
                      <span className="font-semibold text-slate-900">${price}</span>
                    </div>
                    {billingCycle === "yearly" && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 text-sm">Annual Discount</span>
                        <span className="font-semibold text-green-600">-{((1 - price / plan.price.monthly) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-slate-900">Total Today</span>
                      <span className="text-3xl font-bold text-blue-600">${totalPrice}</span>
                    </div>
                    <p className="text-xs text-slate-500 text-right">
                      {billingCycle === "yearly" ? "Billed annually" : "Billed monthly"}
                    </p>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                    <span>Cancel anytime, no questions asked</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Shield className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                    <span>Secure 256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Lock className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                    <span>Instant access to all features</span>
                  </div>
                </div>
              </div>

              {/* Payment Section - 3 columns */}
              <div className="lg:col-span-3">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Information</h2>
                
                {/* Stripe Payment Card */}
                <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Card Payment</div>
                        <div className="text-sm text-slate-500">Powered by Stripe</div>
                      </div>
                    </div>
                    <div className="w-12 h-6 relative opacity-50">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
                        alt="Stripe"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Accepted Cards */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-600 mb-3">Accepted Cards</p>
                    <div className="flex gap-3">
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                        Visa
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                        Mastercard
                      </div>
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                        Amex
                      </div>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      <span>Pay ${totalPrice} with Stripe</span>
                    )}
                  </button>

                  <p className="text-xs text-slate-500 text-center mt-4">
                    Your payment is secured with industry-standard encryption
                  </p>
                </div>

                {/* Coming Soon - Commented Out */}
                {/* 
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 opacity-60">
                  <p className="text-sm text-slate-600 font-semibold mb-3">More Payment Options Coming Soon</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Smartphone className="w-5 h-5" />
                      <span>bKash Mobile Payment</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Smartphone className="w-5 h-5" />
                      <span>Nagad Mobile Payment</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Smartphone className="w-5 h-5" />
                      <span>Rocket Mobile Payment</span>
                    </div>
                  </div>
                </div>
                */}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-2">
            By completing this purchase, you agree to our{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Secure Payment
            </span>
            <span>•</span>
            <span>SSL Encrypted</span>
            <span>•</span>
            <span>PCI Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center pt-24">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
