"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Lock,
  PlayCircle,
  Search,
  Star,
} from "lucide-react";

interface Test {
  _id: string;
  title: string;
  type?: string;
  module: string;
  duration: number;
  difficulty?: string;
  rating?: number;
  usersCount?: number;
  tags?: string[];
  accessLevel: string;
  totalQuestions: number;
  examType: string;
}

type PlanMeta = { name: string; isPremium: boolean; displayOrder: number };

const MODULE_LABELS: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  full: "Full Mock Test",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  hard: "text-rose-700 bg-rose-50 border-rose-200",
};

function formatDuration(minutes: number) {
  if (!minutes) return "No timer";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function prettySlug(slug: string) {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      <div className="h-1.5 bg-slate-200 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
          <div className="h-8 w-8 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200 rounded mt-4" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="h-4 w-20 bg-slate-100 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-4 w-14 bg-slate-100 rounded" />
        </div>
        <div className="pt-2">
          <div className="h-11 w-full bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function StudentMockTestsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<"all" | "unlocked" | "locked">("all");

  const isLoggedIn = !!session?.user;

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || "Failed to load tests");
    return data as {
      tests: Test[];
      accessibleSlugs: string[];
      plansBySlug: Record<string, PlanMeta>;
      pagination: { total: number; pages: number; page: number; limit: number };
    };
  };

  const url = useMemo(() => {
    const params = new URLSearchParams({
      examType: "mock",
      page: String(page),
      limit: "12",
    });
    return `/api/tests?${params}`;
  }, [page]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(url, fetcher, {
    keepPreviousData: true,
    dedupingInterval: 20_000,
    revalidateOnFocus: false,
  });

  const tests = useMemo(() => data?.tests ?? [], [data?.tests]);
  const accessibleSlugs = useMemo(() => data?.accessibleSlugs ?? [], [data?.accessibleSlugs]);
  const plansBySlug = useMemo(() => data?.plansBySlug ?? {}, [data?.plansBySlug]);
  const pagination = data?.pagination || { total: 0, pages: 1, page, limit: 12 };
  const loading = isLoading || (isValidating && !data);

  const isUnlocked = useCallback(
    (test: Test) => accessibleSlugs.includes(test.accessLevel) || test.accessLevel === "free",
    [accessibleSlugs]
  );

  const planLabel = (slug: string) => plansBySlug[slug]?.name || prettySlug(slug) || "Plan";

  const planTone = (slug: string) => {
    const isFree = slug === "free";
    if (isFree) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    const premium = plansBySlug[slug]?.isPremium;
    return premium
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      const unlocked = isUnlocked(t);
      if (accessFilter === "unlocked" && !unlocked) return false;
      if (accessFilter === "locked" && unlocked) return false;
      if (!q) return true;
      const hay = `${t.title} ${t.type || ""} ${t.module} ${(t.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tests, search, accessFilter, isUnlocked]);

  const unlockedCount = useMemo(() => tests.filter(isUnlocked).length, [tests, isUnlocked]);
  const lockedCount = Math.max(0, tests.length - unlockedCount);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Mock Tests
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Choose a full IELTS mock exam, start under timed conditions, then track your results.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/mock-tests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            Browse public page
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Upgrade access
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Available tests</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : tests.length}
          </p>
          <p className="text-xs text-slate-500 mt-2">Published mock exams</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Unlocked for you</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : unlockedCount}
          </p>
          <p className="text-xs text-slate-500 mt-2">You can start these now</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Locked</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : lockedCount}
          </p>
          <p className="text-xs text-slate-500 mt-2">Requires plan upgrade</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or tag..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            aria-label="Filter by access"
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as any)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All access</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setAccessFilter("all");
              setPage(1);
              void mutate();
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            type="button"
          >
            <Filter size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-rose-700">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
          <button
            onClick={() => void mutate()}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Cards */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : filtered.map((test) => {
                const unlocked = isUnlocked(test);
                const plan = test.accessLevel || "free";
                const planName = planLabel(plan);
                const difficultyColor = test.difficulty
                  ? DIFFICULTY_COLORS[test.difficulty.toLowerCase()] ||
                    "text-slate-700 bg-slate-50 border-slate-200"
                  : "text-slate-700 bg-slate-50 border-slate-200";

                return (
                  <div
                    key={test._id}
                    className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div
                      className={`h-1.5 w-full ${
                        unlocked
                          ? "bg-linear-to-r from-sky-500 via-indigo-500 to-fuchsia-500"
                          : "bg-linear-to-r from-slate-200 via-slate-300 to-slate-200"
                      }`}
                    />

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2 min-h-[28px]">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap bg-slate-50 text-slate-700 border border-slate-200">
                            {MODULE_LABELS[test.module] ?? test.module}
                          </span>
                          {test.type && (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap max-w-40 truncate bg-white text-slate-600 border border-slate-200">
                              {test.type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold tracking-wide ${planTone(
                              plan
                            )}`}
                            title={planName}
                          >
                            {planName}
                          </span>
                          {!unlocked && (
                            <div className="p-2 rounded-xl border border-slate-200 text-slate-500 bg-white">
                              <Lock size={14} />
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-900 mt-3 line-clamp-2 leading-snug">
                        {test.title}
                      </h3>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-sky-600" />
                          {formatDuration(test.duration)}
                        </div>
                        {test.difficulty ? (
                          <div className="flex items-center justify-end">
                            <span
                              className={`px-2 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wide ${difficultyColor}`}
                            >
                              {test.difficulty}
                            </span>
                          </div>
                        ) : (
                          <div />
                        )}
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-indigo-600" />
                          {test.totalQuestions ? `${test.totalQuestions} Qs` : "Standard"}
                        </div>
                        <div className="flex items-center justify-end text-amber-600">
                          <Star size={16} fill="currentColor" className="mr-1" />
                          <span className="font-semibold">
                            {test.rating ? test.rating.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5">
                        {unlocked ? (
                          <Link
                            href={`/exam?testId=${test._id}`}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
                          >
                            <PlayCircle size={18} />
                            Start test
                          </Link>
                        ) : (
                          <div className="space-y-2">
                            {isLoggedIn ? (
                              <Link
                                href="/pricing"
                                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
                              >
                                <CheckCircle2 size={18} />
                                Upgrade to unlock
                              </Link>
                            ) : (
                              <Link
                                href={`/login?redirect=${encodeURIComponent(`/exam?testId=${test._id}`)}`}
                                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Lock size={18} />
                                Login to unlock
                              </Link>
                            )}
                            <Link
                              href="/pricing"
                              className="block text-center text-sm font-semibold text-indigo-700 hover:underline"
                            >
                              Requires {planName} · See plans
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-16 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
            <Filter size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-4">No tests found</h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Try changing access filters, or clear your search.
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.pages > 1 && (
        <div className="flex justify-center pt-4">
          <div className="inline-flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              title="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 sm:px-4 sm:py-2 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="hidden sm:inline">Previous</span>
              <ChevronLeft size={18} className="sm:hidden" />
            </button>

            <div className="flex px-2 space-x-1">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                    onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    p === pagination.page
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              title="Next page"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="p-2 sm:px-4 sm:py-2 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={18} className="sm:hidden" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

