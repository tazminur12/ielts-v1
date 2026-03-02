// Example: How to protect your exam page with subscription check
// Place this in your exam page component

import { getUserAccessFromSession } from "@/lib/accessControl";
import Link from "next/link";
import { Lock, Zap } from "lucide-react";

export default async function ExamPageProtected() {
  // Check user's subscription and access
  const access = await getUserAccessFromSession();

  // If no access (no subscription), redirect to pricing
  if (!access || !access.hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Subscription Required
          </h1>
          <p className="text-slate-600 mb-6">
            You need an active subscription to access mock tests. Choose a plan that fits your needs!
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors"
          >
            View Pricing Plans
          </Link>
        </div>
      </div>
    );
  }

  // Check if subscription is expired
  if (access.isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Subscription Expired
          </h1>
          <p className="text-slate-600 mb-6">
            Your subscription has expired. Renew now to continue your IELTS preparation!
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Renew Subscription
          </Link>
        </div>
      </div>
    );
  }

  // Check if user can take mock test
  if (!access.features.canTakeMockTest) {
    const remaining = access.features.remainingMockTests;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Mock Test Limit Reached
          </h1>
          <p className="text-slate-600 mb-2">
            You have used all your mock tests for this billing period.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Remaining tests: {remaining === "unlimited" ? "Unlimited" : remaining}
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  // User has access - show the exam
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Show subscription info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">
                {access.plan?.name || "Active Plan"}
                {access.isTrial && (
                  <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                    Trial
                  </span>
                )}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Remaining Mock Tests:{" "}
                {access.features.remainingMockTests === "unlimited"
                  ? "Unlimited"
                  : access.features.remainingMockTests}
              </p>
            </div>
            <Link
              href="/dashboard/profile"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage Subscription →
            </Link>
          </div>
        </div>

        {/* Your exam component here */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            IELTS Mock Test
          </h1>
          
          {/* Exam sections */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/exam/listening"
              className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Listening</h3>
              <p className="text-slate-600">30 minutes • 40 questions</p>
            </Link>

            <Link
              href="/exam/reading"
              className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Reading</h3>
              <p className="text-slate-600">60 minutes • 40 questions</p>
            </Link>

            <Link
              href="/exam/writing"
              className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Writing</h3>
              <p className="text-slate-600">60 minutes • 2 tasks</p>
              {!access.features.canGetWritingCorrection && (
                <span className="text-xs text-red-600 mt-2 block">
                  ⚠️ No corrections remaining
                </span>
              )}
            </Link>

            <Link
              href="/exam/speaking"
              className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Speaking</h3>
              <p className="text-slate-600">11-14 minutes • 3 parts</p>
              {!access.features.canGetSpeakingEvaluation && (
                <span className="text-xs text-red-600 mt-2 block">
                  ⚠️ No evaluations remaining
                </span>
              )}
            </Link>
          </div>

          {/* Additional features based on plan */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="font-bold text-slate-900 mb-4">Your Plan Features</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${access.features.hasAnalytics ? 'bg-green-50' : 'bg-slate-50'}`}>
                <p className="text-sm font-medium text-slate-700">Analytics Dashboard</p>
                <p className="text-xs text-slate-500 mt-1">
                  {access.features.hasAnalytics ? "✅ Enabled" : "❌ Upgrade to unlock"}
                </p>
              </div>

              <div className={`p-4 rounded-lg ${access.features.hasPersonalizedPlan ? 'bg-green-50' : 'bg-slate-50'}`}>
                <p className="text-sm font-medium text-slate-700">Personalized Plan</p>
                <p className="text-xs text-slate-500 mt-1">
                  {access.features.hasPersonalizedPlan ? "✅ Enabled" : "❌ Upgrade to unlock"}
                </p>
              </div>

              <div className={`p-4 rounded-lg ${access.features.has1on1Coaching ? 'bg-green-50' : 'bg-slate-50'}`}>
                <p className="text-sm font-medium text-slate-700">1-on-1 Coaching</p>
                <p className="text-xs text-slate-500 mt-1">
                  {access.features.has1on1Coaching ? "✅ Enabled" : "❌ Upgrade to unlock"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
