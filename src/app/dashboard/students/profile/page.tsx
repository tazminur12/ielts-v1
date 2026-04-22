'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Gem,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type Profile = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  targetScore?: string;
  nextExamDate?: string | null;
  image?: string;
  dateOfBirth?: string | null;
  gender?: string;
  nationality?: string;
  firstLanguage?: string;
  passportName?: string;
  timeZone?: string;
  preferredExamType?: 'Academic' | 'General Training';
  targetTestDate?: string | null;
  createdAt?: string;
};

type Attempt = {
  _id: string;
  status: 'in_progress' | 'submitted' | 'evaluated';
  examType: 'mock' | 'practice';
  module: string;
  bandScore?: number;
  overallBand?: number;
  sectionBands?: { listening?: number; reading?: number; writing?: number; speaking?: number };
  timeSpent?: number;
  startedAt: string;
  submittedAt?: string;
  testId?: { title?: string };
};

type ActiveSubscription = {
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  endDate?: string;
  billingCycle?: 'monthly' | 'yearly';
  planId?: { name?: string; slug?: string; isPremium?: boolean };
};

function normalizePassportNameClient(v: string) {
  return v
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .replace(/[^A-Z ,'-]/g, '');
}

function getTimeZones(): string[] {
  // Modern browsers / Node 20+ support this.
  const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof anyIntl?.supportedValuesOf === 'function') {
    try {
      return anyIntl.supportedValuesOf('timeZone') as string[];
    } catch {
      // fall through
    }
  }
  // Small, sensible fallback set (covers most users)
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

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatHours(seconds?: number) {
  const secs = typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : 0;
  return (secs / 3600).toFixed(1);
}

function safeBand(n: unknown): number | null {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : null;
  if (v == null) return null;
  if (v < 0) return 0;
  if (v > 9) return 9;
  return v;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);

  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    targetScore: '',
    nextExamDate: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    firstLanguage: '',
    image: '',
    passportName: '',
    timeZone: '',
    preferredExamType: '',
    targetTestDate: '',
  });

  const timeZones = useMemo(() => getTimeZones(), []);

  // If an admin/super-admin lands here, send them to the admin profile page.
  useEffect(() => {
    const role = (session?.user as any)?.role;
    if (role === 'admin' || role === 'super-admin') {
      router.replace('/dashboard/profile');
    }
  }, [router, session?.user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [pRes, aRes, sRes] = await Promise.all([
          fetch('/api/user/profile', { cache: 'no-store' }),
          fetch('/api/attempts?limit=50', { cache: 'no-store' }),
          fetch('/api/subscriptions', { cache: 'no-store' }),
        ]);

        const pJson = await pRes.json();
        const aJson = await aRes.json();
        const sJson = await sRes.json();

        if (!pRes.ok || !pJson?.success) throw new Error(pJson?.error || 'Failed to load profile');
        if (!aRes.ok) throw new Error(aJson?.message || 'Failed to load activity');
        if (!sRes.ok) throw new Error(sJson?.error || 'Failed to load subscription');

        if (!mounted) return;
        const p: Profile = pJson.data ?? {};
        setProfile(p);
        setAttempts((aJson.attempts ?? []).filter((a: Attempt) => a.status !== 'in_progress'));
        setSubscription(sJson?.success ? sJson.data : null);
        setDraft({
          name: p.name ?? session?.user?.name ?? '',
          phone: p.phone ?? '',
          location: p.location ?? '',
          bio: p.bio ?? '',
          targetScore: p.targetScore ?? '',
          nextExamDate: p.nextExamDate ? String(p.nextExamDate).slice(0, 10) : '',
          dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
          gender: p.gender ?? '',
          nationality: p.nationality ?? '',
          firstLanguage: p.firstLanguage ?? '',
          image: p.image ?? '',
          passportName: p.passportName ?? '',
          timeZone: p.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
          preferredExamType: p.preferredExamType ?? '',
          targetTestDate: p.targetTestDate ? String(p.targetTestDate).slice(0, 10) : '',
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Something went wrong');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user?.name]);

  const stats = useMemo(() => {
    const completed = attempts.filter((a) => a.status === 'submitted' || a.status === 'evaluated');
    const totalTimeSeconds = completed.reduce((acc, a) => acc + (a.timeSpent || 0), 0);
    const testsTaken = completed.filter((a) => a.examType === 'mock').length;
    const evaluated = completed.filter((a) => a.status === 'evaluated');
    const withBand = evaluated
      .map((a) => safeBand(a.overallBand ?? a.bandScore))
      .filter((v): v is number => v != null);
    const avgOverall = withBand.length ? (withBand.reduce((x, y) => x + y, 0) / withBand.length).toFixed(1) : '—';

    const fullMocks = evaluated.filter((a) => a.module === 'full' && a.sectionBands);
    const buckets = {
      listening: [] as number[],
      reading: [] as number[],
      writing: [] as number[],
      speaking: [] as number[],
    };
    for (const a of fullMocks) {
      const sb = a.sectionBands!;
      const l = safeBand(sb.listening);
      const r = safeBand(sb.reading);
      const w = safeBand(sb.writing);
      const s = safeBand(sb.speaking);
      if (l != null) buckets.listening.push(l);
      if (r != null) buckets.reading.push(r);
      if (w != null) buckets.writing.push(w);
      if (s != null) buckets.speaking.push(s);
    }
    const skills = Object.fromEntries(
      Object.entries(buckets).map(([k, vals]) => [
        k,
        vals.length ? (vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(1) : '—',
      ])
    ) as Record<keyof typeof buckets, string>;

    // success rate proxy: evaluated attempts with overall >= 7.0
    const successRate =
      withBand.length > 0
        ? `${Math.round((withBand.filter((b) => b >= 7).length / withBand.length) * 100)}%`
        : '—';

    return {
      testsTaken: String(testsTaken),
      practiceHours: `${formatHours(totalTimeSeconds)}h`,
      avgOverall,
      successRate,
      skills,
    };
  }, [attempts]);

  const summary = useMemo(() => {
    const completed = attempts.filter((a) => a.status === 'submitted' || a.status === 'evaluated');
    const evaluated = completed.filter((a) => a.status === 'evaluated');
    const last = completed
      .slice()
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() -
          new Date(a.submittedAt ?? a.startedAt).getTime()
      )[0];
    const lastBand = last ? safeBand(last.overallBand ?? last.bandScore) : null;

    const bands = evaluated
      .map((a) => safeBand(a.overallBand ?? a.bandScore))
      .filter((v): v is number => v != null);
    const best = bands.length ? Math.max(...bands).toFixed(1) : '—';

    return {
      lastAttempt: last ? formatDate(last.submittedAt ?? last.startedAt) : '—',
      lastBand: lastBand != null ? lastBand.toFixed(1) : '—',
      bestOverall: best,
    };
  }, [attempts]);

  const recentActivity = useMemo(() => {
    return attempts
      .slice()
      .sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.startedAt).getTime() - new Date(a.submittedAt ?? a.startedAt).getTime()
      )
      .slice(0, 8)
      .map((a) => {
        const title = a.testId?.title ?? `${a.module} ${a.examType}`;
        const when = formatDate(a.submittedAt ?? a.startedAt);
        const band = safeBand(a.overallBand ?? a.bandScore);
        return {
          id: a._id,
          title,
          when,
          type: a.examType === 'mock' ? 'Test' : 'Practice',
          status: a.status,
          band,
        };
      });
  }, [attempts]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          location: draft.location,
          bio: draft.bio,
          targetScore: draft.targetScore,
          nextExamDate: draft.nextExamDate || null,
          dateOfBirth: draft.dateOfBirth || null,
          gender: draft.gender || '',
          nationality: draft.nationality || '',
          firstLanguage: draft.firstLanguage || '',
          image: draft.image || undefined,
          passportName: draft.passportName || '',
          timeZone: draft.timeZone || '',
          preferredExamType: draft.preferredExamType || '',
          targetTestDate: draft.targetTestDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save profile');
      setProfile(data.data);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Profile</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Your personal details and study profile. You can update your profile fields anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/students/subscription"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-slate-500" />
            Subscription
          </Link>
          <Link
            href="/dashboard/students/results"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <Award className="w-4 h-4" />
            Results
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-rose-600" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
            type="button"
          >
            Reload
          </button>
        </div>
      ) : null}

      {!loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: identity card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 bg-linear-to-r from-indigo-50 via-sky-50 to-fuchsia-50 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white bg-white shrink-0 flex items-center justify-center shadow-sm">
                  {(draft.image || profile?.image || session?.user?.image) ? (
                    <Image
                      src={(draft.image || profile?.image || session?.user?.image) as string}
                      alt="User"
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-800 font-extrabold">
                      {(profile?.name || session?.user?.name || 'U')[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold text-slate-900 truncate">
                    {profile?.name || session?.user?.name || 'Student'}
                  </p>
                  <p className="text-sm text-slate-700/80 mt-0.5 truncate">
                    {profile?.email || session?.user?.email || '—'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide bg-white/70 text-indigo-700 border-white/80 backdrop-blur">
                      Student
                    </span>
                    {profile?.location ? (
                      <span className="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide bg-white/70 text-slate-700 border-white/80 backdrop-blur">
                        {profile.location}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Profile photo
                  </label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Upload profile picture"
                      title="Upload profile picture"
                      className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border file:border-slate-200 file:bg-white file:text-slate-700 file:font-semibold text-slate-600"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          setError('');
                          const form = new FormData();
                          form.append('file', f);
                          const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
                          const data = await res.json();
                          if (!res.ok || !data?.success) {
                            throw new Error(data?.error || 'Upload failed');
                          }
                          setDraft((d) => ({ ...d, image: data.data.image }));
                          setProfile((p) => ({ ...(p || {}), image: data.data.image }));
                        } catch (err: any) {
                          setError(err?.message || 'Failed to upload image');
                        } finally {
                          setSaving(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    PNG/JPG/WEBP up to 2MB. Stored in your account profile.
                  </p>
                </div>
              ) : null}

              {/* Current plan */}
              <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current plan</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {subscription?.planId?.name || 'Free'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {subscription?.status ? `Status: ${subscription.status}` : 'No active subscription'}
                    {subscription?.endDate ? ` · Until ${formatDate(subscription.endDate)}` : ''}
                  </p>
                </div>
                <Link
                  href="/dashboard/students/subscription"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 shrink-0"
                >
                  <Gem className="w-4 h-4" />
                  Manage
                </Link>
              </div>
            </div>

            <div className="p-5">
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat
                label="Last band"
                value={summary.lastBand}
                icon={<Target className="w-4 h-4 text-indigo-700" />}
                tone="from-indigo-50 to-indigo-100/50"
              />
              <MiniStat
                label="Best overall"
                value={summary.bestOverall}
                icon={<Award className="w-4 h-4 text-amber-700" />}
                tone="from-amber-50 to-amber-100/50"
              />
              <MiniStat
                label="Tests taken"
                value={stats.testsTaken}
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                tone="from-emerald-50 to-emerald-100/50"
              />
              <MiniStat
                label="Practice time"
                value={stats.practiceHours}
                icon={<Sparkles className="w-4 h-4 text-sky-700" />}
                tone="from-sky-50 to-sky-100/50"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
              >
                <Pencil className="w-4 h-4" />
                Edit profile
              </button>
              <Link
                href="/dashboard/progress"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                View progress <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            </div>
          </div>

          {/* Right: form or details + activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit panel */}
            {isEditing ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Edit profile</p>
                    <p className="text-xs text-slate-500 mt-0.5">Keep your details up to date.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <Field label="Full name">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Your name"
                    />
                  </Field>

                  <Field label="Email">
                    <div className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {profile?.email || session?.user?.email || '—'}
                    </div>
                  </Field>

                  <Field label="Phone">
                    <input
                      value={draft.phone}
                      onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="+8801XXXXXXXXX"
                    />
                  </Field>

                  <Field label="Location">
                    <input
                      value={draft.location}
                      onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="City, Country"
                    />
                  </Field>

                  <Field label="Passport name (as on passport)">
                    <input
                      value={draft.passportName}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          passportName: normalizePassportNameClient(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="SURNAME, Given Name"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tip: use the same spacing/punctuation as your passport. We auto-uppercase.
                    </p>
                  </Field>

                  <Field label="Nationality">
                    <input
                      value={draft.nationality}
                      onChange={(e) => setDraft((d) => ({ ...d, nationality: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. Bangladeshi"
                    />
                  </Field>

                  <Field label="First language">
                    <input
                      value={draft.firstLanguage}
                      onChange={(e) => setDraft((d) => ({ ...d, firstLanguage: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="e.g. Bengali"
                    />
                  </Field>

                  <Field label="Target band">
                    <select
                      aria-label="Target band"
                      title="Target band"
                      value={draft.targetScore}
                      onChange={(e) => setDraft((d) => ({ ...d, targetScore: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Not set</option>
                      <option value="6.0">Band 6.0</option>
                      <option value="6.5">Band 6.5</option>
                      <option value="7.0">Band 7.0</option>
                      <option value="7.5">Band 7.5</option>
                      <option value="8.0">Band 8.0+</option>
                    </select>
                  </Field>

                  <Field label="Preferred exam type">
                    <select
                      aria-label="Preferred exam type"
                      title="Preferred exam type"
                      value={draft.preferredExamType}
                      onChange={(e) => setDraft((d) => ({ ...d, preferredExamType: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Not set</option>
                      <option value="Academic">Academic</option>
                      <option value="General Training">General Training</option>
                    </select>
                  </Field>

                  <Field label="Next exam date">
                    <input
                      type="date"
                      aria-label="Next exam date"
                      title="Next exam date"
                      value={draft.nextExamDate}
                      onChange={(e) => setDraft((d) => ({ ...d, nextExamDate: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </Field>

                  <Field label="Target test date">
                    <input
                      type="date"
                      aria-label="Target test date"
                      title="Target test date"
                      value={draft.targetTestDate}
                      onChange={(e) => setDraft((d) => ({ ...d, targetTestDate: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </Field>

                  <Field label="Date of birth">
                    <input
                      type="date"
                      aria-label="Date of birth"
                      title="Date of birth"
                      value={draft.dateOfBirth}
                      onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </Field>

                  <Field label="Gender">
                    <select
                      aria-label="Gender"
                      title="Gender"
                      value={draft.gender}
                      onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Field label="Time zone">
                    <select
                      aria-label="Time zone"
                      title="Time zone"
                      value={draft.timeZone}
                      onChange={(e) => setDraft((d) => ({ ...d, timeZone: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Auto-detect</option>
                      {timeZones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Bio">
                      <textarea
                        rows={4}
                        value={draft.bio}
                        onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                        placeholder="Write a short bio about your IELTS goal..."
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" />
                          Save changes
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-900">Profile details</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Joined {formatDate(profile?.createdAt)} · Next exam {formatDate(profile?.nextExamDate || null)}
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoLine icon={<Phone className="w-4 h-4 text-slate-400" />} label="Phone" value={profile?.phone || 'Not set'} />
                  <InfoLine icon={<MapPin className="w-4 h-4 text-slate-400" />} label="Location" value={profile?.location || 'Not set'} />
                  <InfoLine icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Date of birth" value={formatDate(profile?.dateOfBirth || null)} />
                  <InfoLine icon={<Target className="w-4 h-4 text-slate-400" />} label="Target band" value={profile?.targetScore || 'Not set'} />
                  <InfoLine icon={<Mail className="w-4 h-4 text-slate-400" />} label="Passport name" value={profile?.passportName || 'Not set'} />
                  <InfoLine icon={<Sparkles className="w-4 h-4 text-slate-400" />} label="Time zone" value={profile?.timeZone || 'Not set'} />
                  <InfoLine icon={<CheckCircle2 className="w-4 h-4 text-slate-400" />} label="Exam type" value={profile?.preferredExamType || 'Not set'} />
                  <InfoLine icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Target test date" value={formatDate(profile?.targetTestDate || null)} />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bio</p>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                    {profile?.bio || 'No bio yet. Click Edit profile to add your study goal.'}
                  </p>
                </div>
              </div>
            )}

            {/* Activity list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Recent activity</p>
                  <p className="text-xs text-slate-500 mt-0.5">Latest submitted or evaluated attempts.</p>
                </div>
                <Link href="/dashboard/students/results" className="text-sm font-semibold text-blue-600 hover:underline">
                  View all
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No activity yet. Start a mock test to see results here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((a) => (
                    <Link
                      key={a.id}
                      href={`/exam/results?attemptId=${a.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.when}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${
                            a.status === 'evaluated'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-100'
                          }`}
                        >
                          {a.status === 'evaluated' ? `Band ${a.band ?? '—'}` : 'Pending'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = 'from-slate-50 to-slate-100/60',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-linear-to-br ${tone} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="text-lg font-black text-slate-900 tabular-nums mt-1">{value}</p>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}
