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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Simple, Transparent <span className="text-blue-600">Pricing</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Start for free, upgrade when you need more. No hidden fees, cancel anytime.
            Join thousands of students achieving their dream band score.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm font-bold uppercase tracking-wide ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              aria-label={isAnnual ? "Switch to monthly billing" : "Switch to annual billing"}
              className="relative w-16 h-8 bg-slate-200 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div
                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  isAnnual ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-bold uppercase tracking-wide ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Yearly <span className="text-green-500 ml-1 text-xs">(Save 20%)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className={`grid gap-8 ${plans.length === 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'}`}>
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
                className={`relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col ${
                  isPopular
                    ? 'border-2 border-blue-600 shadow-blue-100 scale-105'
                    : 'border border-slate-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-xs mt-1 line-clamp-2">{plan.description}</p>
                  {isUserPlan && (
                    <div className="inline-block mt-3 text-xs font-semibold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                      Current plan
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ${price}
                    </span>
                    <span className="text-slate-500 text-sm">/mo</span>
                  </div>
                  {isAnnual && price > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Save ${(plan.price.monthly - price) * 12}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.slice(0, 6).map((feature, i) => (
                    <li key={i} className="flex items-start text-xs text-slate-700">
                      <Check className={`w-4 h-4 mr-2 shrink-0 mt-0.5 ${isPopular ? 'text-blue-600' : 'text-green-500'}`} />
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                  {features.length > 6 && (
                    <li className="text-xs text-slate-500 italic pl-6">
                      +{features.length - 6} more features
                    </li>
                  )}
                </ul>

                {isUserPlan ? (
                  <div>
                    <button
                      disabled
                      className="block w-full py-3 px-4 text-center text-sm font-bold rounded-lg bg-green-600 text-white cursor-default"
                    >
                      Current Plan
                    </button>
                    <p className="text-xs text-green-600 mt-2">You are subscribed to this plan.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.slug)}
                    className={`block w-full py-3 px-4 text-center text-sm font-bold rounded-lg transition-all ${
                      isPopular
                        ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : plan.price.monthly === 0
                        ? 'text-blue-600 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100'
                        : 'text-slate-700 border-2 border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {plan.price.monthly === 0
                      ? 'Try Free'
                      : plan.trialDays > 0
                      ? `Start ${plan.trialDays}-Day Trial`
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
        <section className="hidden lg:block py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-12">
            Compare Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b-2 border-slate-200 text-lg font-semibold text-slate-900">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan._id}
                      className={`p-4 border-b-2 text-lg font-semibold text-center ${
                        plan.isPremium
                          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                          : 'border-slate-200 text-slate-900'
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
                  { label: "Analytics Dashboard", key: "hasAnalytics" },
                  { label: "Personalized Study Plan", key: "hasPersonalizedPlan" },
                  { label: "Priority Support", key: "hasPrioritySupport" },
                  { label: "1-on-1 Coaching", key: "has1on1Coaching" },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                    <td className="p-4 border-b border-slate-200 font-medium text-slate-700">
                      {row.label}
                    </td>
                    {plans.map((plan) => (
                      <td
                        key={plan._id}
                        className={`p-4 border-b border-slate-200 text-center ${
                          plan.isPremium ? 'font-bold text-blue-600 bg-blue-50/30' : 'text-slate-600'
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "Can I change my plan after subscribing?",
              a: "Yes. You may upgrade or downgrade at any time; changes are applied immediately. Any prorated charges or credits will be calculated based on your billing cycle and reflected on your next invoice."
            },
            {
              q: "What does the 7‑day free trial include?",
              a: "The trial grants full access to the Pro plan for seven days. If you cancel before the trial ends, you will not be charged. After the trial period, billing begins according to the selected billing cycle."
            },
            {
              q: "How accurate is the AI feedback?",
              a: "Our AI models are trained on thousands of graded IELTS responses reviewed by certified examiners. They provide a reliable estimate of performance (typically within ±0.5 band), but should be used alongside human feedback for final evaluation."
            },
            {
              q: "Do you offer institutional or volume pricing?",
              a: "Yes. We provide custom pricing and deployment options for schools, coaching centres, and organisations. Please contact our sales team with your requirements and user count for a tailored proposal."
            }
          ].map((faq, index) => (
            <div key={index} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                {faq.q}
                {openFaq === index ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {openFaq === index && (
                <div className="p-5 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 px-4 text-center bg-white text-slate-900">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to reach your target IELTS band?</h2>
        <p className="text-base md:text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Start a focused, personalised study plan with AI-driven feedback and expert support. Trusted by over 50,000 students worldwide.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-block py-3 px-8 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 hover:shadow transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/pricing#compare"
            className="inline-block py-3 px-6 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all"
          >
            Compare plans
          </Link>
        </div>
      </section>
    </div>
  );
}
