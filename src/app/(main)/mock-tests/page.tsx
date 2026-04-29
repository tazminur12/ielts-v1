"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Clock, Lock, PlayCircle, Star,
  Filter, ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ShieldCheck, Target
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
  easy: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard: "text-rose-600 bg-rose-50 border-rose-200",
};

function formatDuration(minutes: number) {
  if (!minutes) return "No timer";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      <div className="h-2 bg-slate-200 w-full" />
      <div className="p-6 pb-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-6 w-20 bg-slate-100 rounded-full" />
          <div className="h-6 w-8 bg-slate-100 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200 rounded mt-4" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
        <div className="flex gap-4 pt-4">
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-14 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="p-6 pt-0 mt-4">
        <div className="h-12 w-full bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function MockTestsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Failed to load tests");
    }
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

  const tests = data?.tests || [];
  const accessibleSlugs = data?.accessibleSlugs || [];
  const plansBySlug = data?.plansBySlug || {};
  const pagination = data?.pagination || { total: 0, pages: 1, page, limit: 12 };
  const loading = isLoading || (isValidating && !data);

  const isUnlocked = (test: Test) => accessibleSlugs.includes(test.accessLevel) || test.accessLevel === "free";

  const prettyPlanSlug = (slug: string) =>
    String(slug || "")
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const planLabel = (slug: string) => plansBySlug[slug]?.name || prettyPlanSlug(slug) || "Plan";
  const planTone = (slug: string) => {
    const isFree = slug === "free";
    if (isFree) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    const premium = plansBySlug[slug]?.isPremium;
    return premium
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  };

  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      {/* Official-looking Hero Section */}
      <div className="bg-white border-b border-slate-200 mt-16 sm:mt-20 pt-8 pb-6 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-50 blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2 text-xs uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Official Standard Mock Tests</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Elevate Your <span className="text-blue-600">IELTS Score</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed mb-4">
            Experience the real exam environment with our premium mock tests. Get instant, accurate band scores and actionable feedback to secure your dream score.
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs md:text-sm text-slate-700">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
              <CheckCircle2 size={14} className="text-emerald-600" /> 
              <span>Latest 2024 Format</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
              <Target size={14} className="text-blue-600" /> 
              <span>Standardized Grading</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error State */}
        {error && (
          <div className="mx-auto max-w-md bg-red-50 border border-red-200 text-center py-8 px-4 rounded-2xl">
            <p className="text-red-600 font-medium mb-3">
              {error instanceof Error ? error.message : "Something went wrong"}
            </p>
            <button
              onClick={() => void mutate()}
              className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
            >
              Try again
            </button>
          </div>
        )}

        {/* High-End Test Grid */}
        {!error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7 lg:gap-8 items-start">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : tests.map((test) => {
                  const unlocked = isUnlocked(test);
                  const difficultyColor = test.difficulty 
                    ? DIFFICULTY_COLORS[test.difficulty.toLowerCase()] || "text-slate-600 bg-slate-50 border-slate-200"
                    : "text-slate-600 bg-slate-50 border-slate-200";
                  const plan = test.accessLevel || "free";
                  const planName = planLabel(plan);

                  return (
                    <div
                      key={test._id}
                      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
                    >
                      {/* Brand gradient ribbon */}
                      <div
                        className={`h-1.5 w-full ${
                          unlocked
                            ? "bg-linear-to-r from-sky-500 via-indigo-500 to-fuchsia-500"
                            : "bg-linear-to-r from-slate-200 via-slate-300 to-slate-200"
                        }`}
                      />
                      
                      <div className="p-6 sm:p-7 pb-2 grow">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2 min-h-[32px]">
                            <span className="px-3 py-1.5 bg-linear-to-r from-indigo-600 to-sky-600 text-white text-xs font-extrabold uppercase tracking-wider whitespace-nowrap rounded-xl shadow-sm">
                            {MODULE_LABELS[test.module] ?? test.module}
                          </span>
                          {test.type && (
                            <span className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider whitespace-nowrap max-w-40 truncate rounded-xl border border-slate-200">
                              {test.type}
                            </span>
                          )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold tracking-wide shadow-sm backdrop-blur bg-white/80 whitespace-nowrap ${planTone(
                                plan
                              )}`}
                            >
                              {planName}
                            </span>
                            {!unlocked && (
                              <div className="bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-xl border border-slate-200 text-slate-500">
                                <Lock size={14} />
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="text-[20px] sm:text-[22px] font-extrabold text-slate-900 mb-4 transition-colors line-clamp-2 leading-tight">
                          {test.title}
                        </h3>

                        {/* Test Meta Info */}
                        <div className="grid grid-cols-2 gap-y-3 font-medium text-slate-600 text-sm mb-6">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-sky-500" />
                            {formatDuration(test.duration)}
                          </div>
                          {test.difficulty && (
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wide ${difficultyColor}`}>
                                {test.difficulty}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="flex items-center text-amber-500">
                              <Star size={16} fill="currentColor" className="mr-1" />
                              {test.rating ? test.rating.toFixed(1) : "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-indigo-500" />
                            {test.totalQuestions ? `${test.totalQuestions} Qs` : "Standard"}
                          </div>
                        </div>
                      </div>

                      {/* Action Area */}
                      <div className="p-6 sm:p-7 pt-0 mt-auto">
                        <div className="h-px w-full bg-slate-100 mb-4"></div>
                        {unlocked ? (
                          <Link
                            href={`/exam?testId=${test._id}`}
                            className="w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700"
                          >
                            <PlayCircle size={20} />
                            Start test
                          </Link>
                        ) : (
                          <div className="space-y-2">
                            {isLoggedIn ? (
                              <Link
                                href="/pricing"
                                className="w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700"
                              >
                                <CheckCircle2 size={18} />
                                Upgrade to unlock
                              </Link>
                            ) : (
                              <Link
                                href={`/login?redirect=${encodeURIComponent(`/exam?testId=${test._id}`)}`}
                                className="bg-white border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all hover:bg-indigo-50/40"
                              >
                                <Lock size={18} />
                                Login to unlock
                              </Link>
                            )}
                            <p className="text-center text-xs font-semibold text-slate-500">
                              Requires <span className="text-slate-700">{planName}</span>
                            </p>
                            <Link
                              href="/pricing"
                              className="w-full inline-flex items-center justify-center text-sm font-bold text-indigo-700 hover:text-indigo-800 hover:underline"
                            >
                              See plans & pricing
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tests.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-6">
              <Filter size={40} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-[#0f172a] mb-2">No tests found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">We couldn&apos;t find any tests matching your current filter criteria. Try selecting a different module.</p>
          </div>
        )}

        {/* High-End Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center mt-16">
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
    </div>
  );
}
