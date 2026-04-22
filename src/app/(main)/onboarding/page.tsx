'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Search,
  X,
  Globe2,
  GraduationCap,
  Loader2,
  MapPin,
  Plane,
  Sparkles,
} from 'lucide-react';
import countriesRaw from '../../../../data/countries.json';

type PracticeReason = 'study_abroad' | 'immigration' | 'job_requirements' | 'other';

type Profile = {
  name?: string;
  email?: string;
  timeZone?: string;
  country?: string;
  currency?: string;
  practiceReason?: PracticeReason;
  hasIeltsScore?: boolean;
  ieltsScore?: string;
  acceptedTerms?: boolean;
  onboardingCompletedAt?: string | null;
};

type Country = { name: string; code: string };

const countries = (countriesRaw as unknown as Country[]).filter(
  (c) => c && typeof c.name === 'string' && typeof c.code === 'string'
);

function getTimeZones(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof anyIntl?.supportedValuesOf === 'function') {
    try {
      return anyIntl.supportedValuesOf('timeZone') as string[];
    } catch {
      // fall through
    }
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Istanbul',
    'Asia/Dhaka',
    'Asia/Kolkata',
    'Asia/Karachi',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Australia/Sydney',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
  ];
}

const reasonCards: {
  key: PracticeReason;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    key: 'study_abroad',
    title: 'Study abroad',
    subtitle: 'University admission & visas',
    icon: GraduationCap,
    tone: 'from-blue-50 to-indigo-50 text-blue-700',
  },
  {
    key: 'immigration',
    title: 'Immigration',
    subtitle: 'PR, citizenship, relocation',
    icon: Globe2,
    tone: 'from-emerald-50 to-teal-50 text-emerald-700',
  },
  {
    key: 'job_requirements',
    title: 'Job requirements',
    subtitle: 'Work & employer needs',
    icon: BriefcaseBusiness,
    tone: 'from-amber-50 to-orange-50 text-amber-700',
  },
  {
    key: 'other',
    title: 'Other',
    subtitle: 'Anything else',
    icon: Plane,
    tone: 'from-slate-50 to-slate-100 text-slate-700',
  },
];

const currencyOptions = [
  { code: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
];

function combineName(first: string, last: string) {
  const f = String(first ?? '').trim();
  const l = String(last ?? '').trim();
  return [f, l].filter(Boolean).join(' ').trim();
}

function splitName(full: string | undefined) {
  const raw = (full ?? '').trim();
  if (!raw) return { first: '', last: '' };
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function StepDot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'h-2.5 w-2.5 rounded-full inline-block',
        active ? 'bg-blue-600' : 'bg-slate-200',
      ].join(' ')}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const timeZones = useMemo(() => getTimeZones(), []);

  const [draft, setDraft] = useState({
    reason: '' as PracticeReason | '',
    hasScore: '' as '' | 'yes' | 'no',
    score: '',
    firstName: '',
    lastName: '',
    country: '',
    currency: 'BDT',
    timeZone: '',
    acceptedTerms: true,
  });

  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
          router.push('/login?redirect=/onboarding');
          return;
        }
        setLoading(true);
        setError('');
        const res = await fetch('/api/user/profile', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load profile');

        const p: Profile = json.data ?? {};
        if (p.onboardingCompletedAt) {
          router.push('/dashboard');
          return;
        }

        const nameParts = splitName(p.name);
        const tz = p.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

        if (!mounted) return;
        setDraft((d) => ({
          ...d,
          reason: p.practiceReason ?? d.reason,
          hasScore: p.hasIeltsScore === true ? 'yes' : p.hasIeltsScore === false ? 'no' : d.hasScore,
          score: p.ieltsScore ?? d.score,
          firstName: nameParts.first || d.firstName,
          lastName: nameParts.last || d.lastName,
          country: p.country ?? d.country,
          currency: p.currency ?? d.currency,
          timeZone: tz || d.timeZone,
          acceptedTerms: p.acceptedTerms ?? d.acceptedTerms,
        }));
      } catch (e: any) {
        setError(e?.message || 'Something went wrong');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, status]);

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(draft.reason);
    if (step === 2) {
      if (draft.hasScore === 'no') return true;
      if (draft.hasScore === 'yes') return draft.score.trim().length > 0;
      return false;
    }
    return true;
  }, [draft.hasScore, draft.reason, draft.score, step]);

  const savePartial = async (extra?: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        practiceReason: draft.reason || undefined,
        hasIeltsScore: draft.hasScore === 'yes' ? true : draft.hasScore === 'no' ? false : undefined,
        ieltsScore: draft.hasScore === 'yes' ? draft.score : '',
        name: combineName(draft.firstName, draft.lastName) || session?.user?.name || undefined,
        country: draft.country,
        currency: draft.currency,
        timeZone: draft.timeZone,
        acceptedTerms: draft.acceptedTerms,
        ...extra,
      };

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to save');

      // Refresh JWT/session fields (includes onboardingCompletedAt).
      // `update({})` ensures NextAuth triggers the `jwt` callback with `trigger: 'update'`.
      await update({});
      return json.data as Profile;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!canNext) return;
    try {
      if (step === 1) {
        await savePartial();
        setStep(2);
        return;
      }
      if (step === 2) {
        await savePartial();
        setStep(3);
        return;
      }
      // final submit
      await savePartial({ completeOnboarding: true });
      // Hard navigate so middleware sees fresh token
      window.location.href = '/dashboard';
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    }
  };

  const handlePrev = async () => {
    if (step === 1) return;
    setStep((s) => (s === 3 ? 2 : 1));
  };

  useEffect(() => {
    if (!isCountryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCountryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCountryOpen]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countryQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-[110px]" />
        <div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-200/35 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] bg-size-[22px_22px]" />
      </div>

      {/* Navbar is fixed, so we need top padding */}
      <div className="relative px-4 pt-28 pb-10 lg:pt-32">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
              Quick onboarding
            </span>
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Create your profile
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium">
            This takes less than a minute. You can edit everything later.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  'h-9 w-9 rounded-full grid place-items-center text-sm font-extrabold',
                  step === 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200',
                ].join(' ')}
              >
                1
              </span>
              <StepDot active={step >= 1} />
              <StepDot active={step >= 2} />
              <span
                className={[
                  'h-9 w-9 rounded-full grid place-items-center text-sm font-extrabold',
                  step === 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200',
                ].join(' ')}
              >
                2
              </span>
              <StepDot active={step >= 2} />
              <StepDot active={step >= 3} />
              <span
                className={[
                  'h-9 w-9 rounded-full grid place-items-center text-sm font-extrabold',
                  step === 3 ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200',
                ].join(' ')}
              >
                3
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-4xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_24px_64px_-20px_rgba(15,23,42,0.25)]">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="p-6 sm:p-10">
              {error ? (
                <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              ) : null}

              {step === 1 ? (
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 text-center">
                    My reason for practicing IELTS
                  </h2>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reasonCards.map((c) => {
                      const selected = draft.reason === c.key;
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, reason: c.key }))}
                          className={[
                            'group rounded-3xl border p-5 text-left transition-all relative overflow-hidden',
                            selected
                              ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-slate-200 bg-white hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={[
                                'h-11 w-11 rounded-2xl grid place-items-center border bg-linear-to-br',
                                c.tone,
                                selected ? 'border-white/60' : 'border-slate-200',
                              ].join(' ')}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            {selected ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[11px] font-extrabold">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm font-extrabold text-slate-900 mt-4">{c.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{c.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-10">
                    <h3 className="text-lg font-extrabold text-slate-900 text-center">
                      How about an IELTS score?
                    </h3>
                    <div className="mt-4 flex items-center justify-center gap-8">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="hasScore"
                          value="yes"
                          checked={draft.hasScore === 'yes'}
                          onChange={() => setDraft((d) => ({ ...d, hasScore: 'yes' }))}
                        />
                        I have an IELTS score
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="hasScore"
                          value="no"
                          checked={draft.hasScore === 'no'}
                          onChange={() => setDraft((d) => ({ ...d, hasScore: 'no', score: '' }))}
                        />
                        I don&apos;t have an IELTS score
                      </label>
                    </div>
                    {draft.hasScore === 'yes' ? (
                      <div className="mt-4 max-w-sm mx-auto">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          Overall band (0.0–9.0)
                        </label>
                        <input
                          value={draft.score}
                          onChange={(e) => setDraft((d) => ({ ...d, score: e.target.value }))}
                          inputMode="decimal"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g. 6.5"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 text-center">
                    Basic details
                  </h2>
                  <p className="text-sm text-slate-600 text-center mt-1">
                    We&apos;ll personalize your dashboard using this info.
                  </p>

                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First name *">
                      <input
                        value={draft.firstName}
                        onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="First name"
                      />
                    </Field>
                    <Field label="Last name *">
                      <input
                        value={draft.lastName}
                        onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Last name"
                      />
                    </Field>

                    <Field label="Email">
                      <div className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500">
                        {session?.user?.email || '—'}
                      </div>
                    </Field>

                    <Field label="Country/Region of residence *">
                      <button
                        type="button"
                        onClick={() => {
                          setCountryQuery('');
                          setIsCountryOpen(true);
                        }}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-3"
                        aria-label="Select country or region of residence"
                        title="Select country or region of residence"
                      >
                        <span className={`inline-flex items-center gap-2 min-w-0 ${draft.country ? 'text-slate-900' : 'text-slate-400'}`}>
                          <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="truncate font-semibold">
                            {draft.country || 'Select country/region'}
                          </span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    </Field>

                    <Field label="Display currency *">
                      <select
                        aria-label="Display currency"
                        title="Display currency"
                        value={draft.currency}
                        onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {currencyOptions.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Timezone *">
                      <select
                        aria-label="Timezone"
                        title="Timezone"
                        value={draft.timeZone}
                        onChange={(e) => setDraft((d) => ({ ...d, timeZone: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select timezone</option>
                        {timeZones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 text-center">
                    Confirm & finish
                  </h2>
                  <p className="text-sm text-slate-600 text-center mt-1">
                    You can edit your profile anytime from the dashboard.
                  </p>

                  <div className="mt-8 space-y-4 max-w-2xl mx-auto">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</p>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <Line label="Name" value={combineName(draft.firstName, draft.lastName) || '—'} />
                        <Line label="Email" value={session?.user?.email || '—'} />
                        <Line
                          label="Reason"
                          value={
                            draft.reason
                              ? reasonCards.find((r) => r.key === draft.reason)?.title || draft.reason
                              : '—'
                          }
                        />
                        <Line
                          label="IELTS score"
                          value={
                            draft.hasScore === 'no'
                              ? 'No score yet'
                              : draft.hasScore === 'yes'
                              ? `Band ${draft.score || '—'}`
                              : '—'
                          }
                        />
                        <Line label="Country" value={draft.country || '—'} />
                        <Line label="Currency" value={draft.currency || '—'} />
                        <Line label="Timezone" value={draft.timeZone || '—'} />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                      <input
                        type="checkbox"
                        checked={draft.acceptedTerms}
                        onChange={(e) => setDraft((d) => ({ ...d, acceptedTerms: e.target.checked }))}
                        className="mt-1"
                      />
                      <span className="text-sm text-slate-700">
                        I confirm that I accept the site&apos;s{' '}
                        <span className="font-semibold text-slate-900">Terms</span> and{' '}
                        <span className="font-semibold text-slate-900">Privacy</span> policy.
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="mt-10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={saving || step === 1}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-800 font-extrabold text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving || !canNext || (step === 3 && !draft.acceptedTerms)}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2 shadow-lg shadow-slate-900/10"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {step === 3 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Country selection modal */}
        {isCountryOpen ? (
          <div className="fixed inset-0 z-80">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsCountryOpen(false)}
              aria-label="Close country selector"
            />

            <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-3 sm:p-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Select country"
                className="w-full sm:max-w-xl bg-white rounded-4xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900">Country/Region</p>
                    <p className="text-xs text-slate-500 font-medium">Search and select your residence.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCountryOpen(false)}
                    className="p-2 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Close"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      autoFocus
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      placeholder="Search country… (e.g. Bangladesh)"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {countryQuery ? (
                      <button
                        type="button"
                        onClick={() => setCountryQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                        aria-label="Clear search"
                        title="Clear"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-medium">
                    {filteredCountries.length.toLocaleString()} results
                  </p>
                </div>

                <div className="flex-1 overflow-auto">
                  {filteredCountries.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-extrabold text-slate-900">No matches</p>
                      <p className="text-xs text-slate-500 mt-1">Try a different search term.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {filteredCountries.slice(0, 250).map((c) => {
                        const selected = (draft.country || '').toLowerCase() === c.name.toLowerCase();
                        return (
                          <li key={c.code}>
                            <button
                              type="button"
                              onClick={() => {
                                setDraft((d) => ({ ...d, country: c.name }));
                                setIsCountryOpen(false);
                              }}
                              className={[
                                'w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3',
                                selected ? 'bg-blue-50' : '',
                              ].join(' ')}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-extrabold text-slate-900 truncate">{c.name}</p>
                                <p className="text-xs text-slate-500 font-semibold">{c.code}</p>
                              </div>
                              {selected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[11px] font-extrabold shrink-0">
                                  <BadgeCheck className="h-3.5 w-3.5" />
                                  Selected
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCountryOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 font-extrabold text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // allow empty selection, but keep modal responsive
                      setIsCountryOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-500">
          Tip: If you skip something now, you can update it later from{' '}
          <span className="font-semibold text-slate-700">Dashboard → Profile</span>.
        </p>
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className="text-slate-900 font-extrabold text-right">{value}</span>
    </div>
  );
}

