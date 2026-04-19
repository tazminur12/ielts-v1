'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: { monthly: number; yearly: number };
  features: {
    mockTests: number | 'unlimited';
    speakingEvaluations: number | 'unlimited';
    writingCorrections: number | 'unlimited';
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
    customFeatures?: string[];
  };
  isPremium: boolean;
  trialDays: number;
  displayOrder: number;
}

export default function PricingPage() {
  const { data: session } = useSession();
  const [isAnnual, setIsAnnual] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resPlans = await fetch('/api/plans', {
          cache: 'no-store',
        });
        const dataPlans = await resPlans.json();

        if (dataPlans.success) {
          setPlans(dataPlans.data);
        }

        if (session?.user) {
          const resSub = await fetch('/api/subscriptions');
          const dataSub = await resSub.json();
          if (dataSub.success && dataSub.data) {
            setActiveSubscription(dataSub.data);
          }
        }
      } catch (err) {
        console.error('Data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const handleSubscribe = (planSlug: string) => {
    if (!session) {
      window.location.href = `/signup?plan=${planSlug}`;
      return;
    }
    window.location.href = `/checkout?plan=${planSlug}&billing=${
      isAnnual ? 'yearly' : 'monthly'
    }`;
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={!isAnnual ? 'font-bold text-black' : 'text-black'}>
            Monthly
          </span>

          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-7 bg-slate-200 rounded-full p-1"
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transform ${
                isAnnual ? 'translate-x-7' : ''
              }`}
            />
          </button>

          <span className={isAnnual ? 'font-bold text-black' : 'text-black'}>
            Yearly (Save 20%)
          </span>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map(plan => {
            const price = isAnnual ? plan.price.yearly : plan.price.monthly;

            const isUserPlan = activeSubscription?.planId?._id === plan._id;

            return (
              <div
                key={plan._id}
                className={`bg-white rounded-2xl p-8 border-2 shadow-sm relative ${
                  plan.isPremium ? 'border-blue-600' : 'border-slate-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.isPremium && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    POPULAR
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold mb-2 text-black">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-sm mb-6 leading-relaxed text-black">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-black">
                    ${price}
                  </span>
                  <span className="text-sm ml-1 text-black">/mo</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-2 text-sm text-black">
                    <Check className="text-green-500 w-5 h-5 shrink-0" />
                    {plan.features.mockTests} Mock Tests
                  </li>

                  <li className="flex gap-2 text-sm text-black">
                    <Check className="text-green-500 w-5 h-5 shrink-0" />
                    {plan.features.speakingEvaluations} Speaking Evals
                  </li>

                  {plan.features.hasAnalytics && (
                    <li className="flex gap-2 text-sm text-black">
                      <Check className="text-green-500 w-5 h-5 shrink-0" />
                      Analytics Dashboard
                    </li>
                  )}

                  {plan.features.has1on1Coaching && (
                    <li className="flex gap-2 text-sm text-black">
                      <Check className="text-green-500 w-5 h-5 shrink-0" />
                      1-on-1 Coaching
                    </li>
                  )}

                  {plan.features.customFeatures?.map((cf, i) => (
                    <li key={i} className="flex gap-2 text-sm text-black">
                      <Check className="text-blue-500 w-5 h-5 shrink-0" />
                      {cf}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button
                  onClick={() => !isUserPlan && handleSubscribe(plan.slug)}
                  className={`w-full py-3 rounded-xl font-bold text-sm ${
                    isUserPlan
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isUserPlan
                    ? 'Current Plan'
                    : plan.trialDays > 0
                      ? `Start ${plan.trialDays} Day Trial`
                      : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty */}
        {plans.length === 0 && (
          <div className="text-center mt-20 text-black">No plans found</div>
        )}
      </div>
    </div>
  );
}
