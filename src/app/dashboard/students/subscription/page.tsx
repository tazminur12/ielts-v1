'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  CreditCard,
  FileText,
  Gem,
  Loader2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TriangleAlert,
} from 'lucide-react';
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

type Subscription = {
  _id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate: string;
  autoRenew?: boolean;
  billingCycle?: 'monthly' | 'yearly';
  paymentMethod?: string;
  transactionId?: string;
  planId?: Plan;
  features?: {
    mockTests: number | 'unlimited';
    mockTestsUsed: number;
    speakingEvaluations: number | 'unlimited';
    speakingEvaluationsUsed: number;
    writingCorrections: number | 'unlimited';
    writingCorrectionsUsed: number;
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
  };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function quotaLabel(v: number | 'unlimited') {
  return v === 'unlimited' ? 'Unlimited' : String(v);
}

function usagePct(used: number, quota: number | 'unlimited') {
  if (quota === 'unlimited') return 0;
  if (!quota || quota <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / quota) * 100)));
}

function pctToWidthClass(pct: number) {
  if (pct <= 0) return 'w-0';
  if (pct < 10) return 'w-[8%]';
  if (pct < 20) return 'w-[16%]';
  if (pct < 30) return 'w-[24%]';
  if (pct < 40) return 'w-[32%]';
  if (pct < 50) return 'w-[40%]';
  if (pct < 60) return 'w-[52%]';
  if (pct < 70) return 'w-[64%]';
  if (pct < 80) return 'w-[76%]';
  if (pct < 90) return 'w-[88%]';
  return 'w-full';
}

function statusTone(status?: Subscription['status']) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'trial') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (status === 'expired') return 'bg-slate-50 text-slate-700 border-slate-200';
  return 'bg-rose-50 text-rose-800 border-rose-200';
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [isAnnual, setIsAnnual] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutating, setMutating] = useState<'cancel' | 'renew' | ''>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
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
          } else {
            setActiveSubscription(null);
          }
        }
      } catch (err) {
        setError('Failed to load subscription details.');
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

  const handleSubscriptionAction = async (action: 'cancel' | 'renew') => {
    if (!session?.user) {
      window.location.href = '/login?redirect=/dashboard/students/subscription';
      return;
    }
    setMutating(action);
    setError('');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update subscription');
      }
      const resSub = await fetch('/api/subscriptions', { cache: 'no-store' });
      const dataSub = await resSub.json();
      setActiveSubscription(dataSub?.success ? dataSub.data : null);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setMutating('');
    }
  };

  if (loading)
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Subscription
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Manage your plan, track usage, and upgrade access when you need more features.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Gem className="w-4 h-4 text-slate-500" />
            Public pricing
          </Link>
          <Link
            href="/dashboard/mock-tests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Use premium features
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-rose-600" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
          >
            Reload
          </button>
        </div>
      )}

      {/* Current subscription */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Current plan</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSubscription?.planId?.name
                  ? `You are on ${activeSubscription.planId.name}.`
                  : 'No active subscription found.'}
              </p>
            </div>
          </div>
          {activeSubscription?.status && (
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${statusTone(
                activeSubscription.status
              )}`}
            >
              {activeSubscription.status}
            </span>
          )}
        </div>

        {activeSubscription ? (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Billing cycle
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-1 capitalize">
                  {activeSubscription.billingCycle || '—'}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Start: {formatDate(activeSubscription.startDate)} · End: {formatDate(activeSubscription.endDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Auto-renew
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-extrabold text-slate-900">
                    {activeSubscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </p>
                  {activeSubscription.autoRenew ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  You can cancel or re-enable renewal anytime.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payment
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-1 capitalize">
                  {activeSubscription.paymentMethod || '—'}
                </p>
                <p className="text-xs text-slate-500 mt-2 truncate">
                  Transaction: {activeSubscription.transactionId || '—'}
                </p>
              </div>
            </div>

            {/* Usage */}
            {activeSubscription.features && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  {
                    label: 'Mock tests',
                    quota: activeSubscription.features.mockTests,
                    used: activeSubscription.features.mockTestsUsed,
                  },
                  {
                    label: 'Speaking evaluations',
                    quota: activeSubscription.features.speakingEvaluations,
                    used: activeSubscription.features.speakingEvaluationsUsed,
                  },
                  {
                    label: 'Writing corrections',
                    quota: activeSubscription.features.writingCorrections,
                    used: activeSubscription.features.writingCorrectionsUsed,
                  },
                ] as const).map((item) => {
                  const pct = usagePct(item.used, item.quota);
                  const w = pctToWidthClass(pct);
                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs font-bold text-slate-500 tabular-nums">
                          {item.quota === 'unlimited'
                            ? 'Unlimited'
                            : `${item.used} / ${quotaLabel(item.quota)}`}
                        </p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${w} bg-linear-to-r from-sky-500 to-indigo-600 rounded-full`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {item.quota === 'unlimited' ? 'No usage limit for this feature.' : `${pct}% used`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                <CreditCard className="w-4 h-4" />
                Compare plans
              </Link>
              {activeSubscription.autoRenew ? (
                <button
                  onClick={() => handleSubscriptionAction('cancel')}
                  disabled={mutating === 'cancel'}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-60"
                  type="button"
                >
                  {mutating === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Cancel auto-renew
                </button>
              ) : (
                <button
                  onClick={() => handleSubscriptionAction('renew')}
                  disabled={mutating === 'renew'}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-60"
                  type="button"
                >
                  {mutating === 'renew' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enable auto-renew
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <Gem className="w-5 h-5 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">You’re on free access</p>
                <p className="text-sm text-slate-600 mt-1">
                  Upgrade anytime to unlock more mock tests and premium feedback.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade now
                  </Link>
                  <Link
                    href="/dashboard/mock-tests"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Start a mock test
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade options */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Upgrade options</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose monthly or yearly billing.
            </p>
          </div>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
          >
            {isAnnual ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
            {isAnnual ? 'Yearly' : 'Monthly'}
          </button>
        </div>

        <div className="p-5">
          {plans.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No plans found.
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const price = isAnnual ? plan.price.yearly : plan.price.monthly;
                const isUserPlan = activeSubscription?.planId?._id === plan._id;
                return (
                  <div
                    key={plan._id}
                    className={`rounded-2xl p-5 border shadow-sm relative ${
                      plan.isPremium ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {plan.isPremium && (
                      <div className="absolute -top-3 left-5 bg-slate-900 text-white text-[11px] px-3 py-1 rounded-full font-extrabold tracking-wide">
                        Recommended
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold text-slate-900">{plan.name}</p>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{plan.description}</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                        <Gem className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-black text-slate-900">${price}</span>
                      <span className="text-sm text-slate-500 ml-1">/ {isAnnual ? 'year' : 'month'}</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li className="flex gap-2">
                        <Check className="text-emerald-600 w-5 h-5 shrink-0" />
                        {quotaLabel(plan.features.mockTests)} mock tests
                      </li>
                      <li className="flex gap-2">
                        <Check className="text-emerald-600 w-5 h-5 shrink-0" />
                        {quotaLabel(plan.features.speakingEvaluations)} speaking evaluations
                      </li>
                      <li className="flex gap-2">
                        <Check className="text-emerald-600 w-5 h-5 shrink-0" />
                        {quotaLabel(plan.features.writingCorrections)} writing corrections
                      </li>
                      {plan.features.hasAnalytics && (
                        <li className="flex gap-2">
                          <Check className="text-emerald-600 w-5 h-5 shrink-0" />
                          Analytics dashboard
                        </li>
                      )}
                      {plan.features.hasPrioritySupport && (
                        <li className="flex gap-2">
                          <Check className="text-emerald-600 w-5 h-5 shrink-0" />
                          Priority support
                        </li>
                      )}
                      {plan.features.customFeatures?.slice(0, 2).map((cf, i) => (
                        <li key={i} className="flex gap-2">
                          <Check className="text-indigo-600 w-5 h-5 shrink-0" />
                          {cf}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => !isUserPlan && handleSubscribe(plan.slug)}
                      className={`mt-5 w-full py-3 rounded-2xl font-bold text-sm ${
                        isUserPlan
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                      type="button"
                      disabled={isUserPlan}
                    >
                      {isUserPlan
                        ? 'Current plan'
                        : plan.trialDays > 0
                        ? `Start ${plan.trialDays}-day trial`
                        : 'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
