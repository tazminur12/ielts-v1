"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import Swal from "sweetalert2";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");
  const planSlug = searchParams.get("plan");
  const billingCycle = searchParams.get("billing");

  useEffect(() => {
    if (sessionId && planSlug) {
      createSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, planSlug]);

  const createSubscription = async () => {
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug,
          billingCycle,
          paymentMethod: "card",
          transactionId: sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLoading(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to activate subscription. Please contact support.",
      });
      router.push("/pricing");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Activating your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Payment Successful! 🎉
          </h1>
          
          <p className="text-slate-600 mb-8">
            Your subscription has been activated successfully. You now have full access to all features!
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-8">
            <p className="text-sm text-slate-600 mb-2">What&apos;s next?</p>
            <ul className="text-left space-y-3 text-slate-700">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                <span>Access unlimited IELTS mock tests</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                <span>Get AI-powered feedback on your performance</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                <span>Track your progress with advanced analytics</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                <span>Start preparing for your IELTS exam today</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
