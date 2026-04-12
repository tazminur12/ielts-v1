"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface PlanFeatures {
  mockTests: number | "unlimited";
  speakingEvaluations: number | "unlimited";
  writingCorrections: number | "unlimited";
  hasAnalytics: boolean;
  hasPersonalizedPlan: boolean;
  hasPrioritySupport: boolean;
  has1on1Coaching: boolean;
  customFeatures?: string[];
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeatures;
  isPremium: boolean;
  trialDays: number;
  displayOrder: number;
}

export default function PricingPage() {
  const { data: session } = useSession();
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // If user is logged in, fetch their active subscription to mark owned plan
    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/subscriptions');
        const data = await res.json();
        if (data.success && data.data) {
          setActiveSubscription(data.data);
        } else {
          setActiveSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setActiveSubscription(null);
      }
    };

    if (session && session.user) {
      fetchSubscription();
    } else {
      setActiveSubscription(null);
    }
  }, [session]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const formatFeature = (value: number | "unlimited" | boolean) => {
    if (value === "unlimited") return "Unlimited";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value.toString();
  };

  const getPlanFeatures = (plan: Plan) => {
    const features: string[] = [];

    if (plan.features.mockTests === "unlimited") {
      features.push("Unlimited Mock Tests");
    } else if (plan.features.mockTests > 0) {
      features.push(`${plan.features.mockTests} Mock Test${plan.features.mockTests > 1 ? 's' : ''}`);
    }

    if (plan.features.speakingEvaluations === "unlimited") {
      features.push("Unlimited Speaking Evaluations");
    } else if (plan.features.speakingEvaluations > 0) {
      features.push(`${plan.features.speakingEvaluations} Speaking Evaluation${plan.features.speakingEvaluations > 1 ? 's' : ''}/mo`);
    }

    if (plan.features.writingCorrections === "unlimited") {
      features.push("Unlimited Writing Corrections");
    } else if (plan.features.writingCorrections > 0) {
      features.push(`${plan.features.writingCorrections} Writing Correction${plan.features.writingCorrections > 1 ? 's' : ''}/mo`);
    }

    if (plan.features.hasAnalytics) {
      features.push("Advanced Analytics Dashboard");
    }

    if (plan.features.hasPersonalizedPlan) {
      features.push("Personalized Study Plan");
    }

    if (plan.features.hasPrioritySupport) {
      features.push("Priority Support");
    }

    if (plan.features.has1on1Coaching) {
      features.push("1-on-1 Expert Coaching");
    }

    if (plan.features.customFeatures) {
      features.push(...plan.features.customFeatures);
    }

    return features;
  };

  const handleSubscribe = async (planSlug: string) => {
    if (!session) {
      window.location.href = `/signup?plan=${planSlug}`;
      return;
    }

    // Redirect to checkout or payment page
    window.location.href = `/checkout?plan=${planSlug}&billing=${isAnnual ? 'yearly' : 'monthly'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-50 blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Simple, Transparent <span className="text-blue-600">Pricing</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-6 leading-relaxed">
            Start for free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-xs font-bold uppercase tracking-wide ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              aria-label={isAnnual ? "Switch to monthly billing" : "Switch to annual billing"}
              className="relative w-14 h-7 bg-slate-300 rounded-full p-1 transition-colors duration-300 focus:outline-none"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
                  isAnnual ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold uppercase tracking-wide ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Yearly <span className="text-green-600 ml-1 text-xs">(Save 20%)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className={`grid gap-6 ${plans.length === 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'}`}>
          {plans.map((plan) => {
            const features = getPlanFeatures(plan);
            const price = isAnnual ? plan.price.yearly : plan.price.monthly;
            const isPopular = plan.isPremium;
            const isUserPlan = Boolean(
              activeSubscription &&
                (activeSubscription.planId?._id === plan._id || activeSubscription.planId?.slug === plan.slug)
            );

            return (
              <div
                key={plan._id}
                className={`relative bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex flex-col ${
                  isPopular
                    ? 'border-2 border-blue-600'
                    : 'border border-slate-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-slate-600 text-xs mt-1 line-clamp-2">{plan.description}</p>
                  {isUserPlan && (
                    <div className="inline-block mt-2 text-xs font-semibold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                      Current plan
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ${price}
                    </span>
                    <span className="text-slate-500 text-xs">/mo</span>
                  </div>
                  {isAnnual && price > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Save ${(plan.price.monthly - price) * 12}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-start text-xs text-slate-700">
                      <Check className={`w-4 h-4 mr-2 shrink-0 mt-0.5 ${isPopular ? 'text-blue-600' : 'text-green-500'}`} />
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                  {features.length > 5 && (
                    <li className="text-xs text-slate-500 italic pl-6">
                      +{features.length - 5} more
                    </li>
                  )}
                </ul>

                {isUserPlan ? (
                  <div>
                    <button
                      disabled
                      className="block w-full py-2 px-4 text-center text-xs font-bold rounded-lg bg-green-600 text-white cursor-default"
                    >
                      Current Plan
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.slug)}
                    className={`block w-full py-2 px-4 text-center text-xs font-bold rounded-lg transition-all ${
                      isPopular
                        ? 'text-white bg-blue-600 hover:bg-blue-700'
                        : plan.price.monthly === 0
                        ? 'text-blue-600 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100'
                        : 'text-slate-700 border-2 border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {plan.price.monthly === 0
                      ? 'Try Free'
                      : plan.trialDays > 0
                      ? `${plan.trialDays}-Day Trial`
                      : `Get Started`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      {plans.length > 1 && (
        <section className="hidden lg:block py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            Compare Features
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-900 text-sm">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan._id}
                      className={`p-4 font-semibold text-center text-sm ${
                        plan.isPremium
                          ? 'border-l border-blue-600 text-blue-600 bg-blue-50'
                          : 'border-l border-slate-200 text-slate-900'
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Mock Tests", key: "mockTests" },
                  { label: "Speaking Evaluations", key: "speakingEvaluations" },
                  { label: "Writing Corrections", key: "writingCorrections" },
                  { label: "Analytics", key: "hasAnalytics" },
                  { label: "Study Plan", key: "hasPersonalizedPlan" },
                  { label: "Priority Support", key: "hasPrioritySupport" },
                  { label: "1-on-1 Coaching", key: "has1on1Coaching" },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-slate-200 ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                    <td className="p-4 font-medium text-slate-700 text-sm">
                      {row.label}
                    </td>
                    {plans.map((plan) => (
                      <td
                        key={plan._id}
                        className={`p-4 border-l text-center text-sm ${
                          plan.isPremium ? 'font-bold text-blue-600 bg-blue-50/50 border-blue-200' : 'text-slate-600 border-slate-200'
                        }`}
                      >
                        {formatFeature(plan.features[row.key as keyof PlanFeatures] as number | "unlimited" | boolean)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "Can I change my plan after subscribing?",
              a: "Yes. You can upgrade or downgrade at any time. Changes are applied immediately with prorated charges calculated based on your billing cycle."
            },
            {
              q: "What does the free trial include?",
              a: "The trial grants full access to our platform for the specified period. If you cancel before the trial ends, you will not be charged."
            },
            {
              q: "How accurate is the grading?",
              a: "Our system uses standardized evaluation criteria aligned with official IELTS standards to provide reliable band score estimates."
            },
            {
              q: "Do you offer group or institutional pricing?",
              a: "Yes. We provide custom pricing for schools and organizations. Please contact our sales team for tailored proposals."
            }
          ].map((faq, index) => (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-sm"
              >
                {faq.q}
                {openFaq === index ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {openFaq === index && (
                <div className="p-4 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50 text-sm">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-10 px-4 text-center bg-white border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to achieve your IELTS goals?</h2>
        <p className="text-slate-600 text-sm mb-6 max-w-2xl mx-auto">
          Start your focused, personalized study plan with expert support. Trusted by thousands of students worldwide.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/signup"
            className="inline-block py-2 px-6 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/pricing#compare"
            className="inline-block py-2 px-5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-all"
          >
            Compare plans
          </Link>
        </div>
      </section>
    </div>
  );
}
