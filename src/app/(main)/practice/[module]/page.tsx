"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  Clock, BarChart, Lock, PlayCircle, Star,
  Filter, ChevronLeft, ChevronRight, BookOpen,
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
  full: "Full Mock",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-500",
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
      <div className="p-6 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-100 rounded" />
          <div className="h-5 w-12 bg-slate-100 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200 rounded" />
        <div className="flex gap-4">
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-14 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="px-6 py-3 bg-slate-50 border-t border-b border-slate-100 flex justify-between">
        <div className="h-4 w-10 bg-slate-100 rounded" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
      </div>
      <div className="p-6">
        <div className="h-11 w-full bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function PracticeModulePage() {
  const params = useParams();
  const moduleSlug = params?.module as string; 
  
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

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
    if (!moduleSlug) return null;
    const queryParams = new URLSearchParams({
      examType: "practice",
      page: String(page),
      limit: "12",
      module: moduleSlug,
    });
    if (filter && filter !== "All") queryParams.set("type", filter);
    return `/api/tests?${queryParams}`;
  }, [moduleSlug, page, filter]);

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

  const isUnlocked = (test: Test) =>
    accessibleSlugs.includes(test.accessLevel) || test.accessLevel === "free";

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

  const TYPE_FILTERS = ["All", "Academic", "General"];

  const displayModuleName = MODULE_LABELS[moduleSlug?.toLowerCase()] || moduleSlug;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pt-20 pb-20">

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 capitalize">
              {displayModuleName} Practice Tests
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Focus on {displayModuleName?.toLowerCase()} capabilities with targeted exercises and questions designed to improve your band score.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={16} />
            <span>{pagination.total} tests found</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-12 text-red-500">
            <p>{error instanceof Error ? error.message : "Something went wrong"}</p>
            <button
              onClick={() => void mutate()}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Test Grid */}
        {!error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7 lg:gap-8">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : tests.map((test) => {
                  const unlocked = isUnlocked(test);
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

                      {/* Status Badges */}
                      <div className="absolute top-5 right-5 z-10 flex gap-2">
                        <span
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold tracking-wide shadow-sm backdrop-blur bg-white/80 ${planTone(
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

                      {/* Card Header */}
                      <div className="p-6 sm:p-7 pb-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap gap-2">
                            {test.type && (
                              <span className="px-3 py-1.5 bg-linear-to-r from-indigo-600 to-sky-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl shadow-sm">
                                {test.type}
                              </span>
                            )}
                            {(test.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="px-3 py-1.5 bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <h3 className="text-[20px] sm:text-[22px] font-extrabold text-slate-900 mb-2 transition-colors line-clamp-2 leading-tight">
                          {test.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-1">
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-sky-500" />
                            {formatDuration(test.duration)}
                          </div>
                          {test.difficulty && (
                            <div className={`flex items-center gap-1 capitalize font-medium ${DIFFICULTY_COLORS[test.difficulty] ?? "text-slate-500"}`}>
                              <BarChart size={14} />
                              {test.difficulty}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-slate-400">
                            <BookOpen size={14} className="text-indigo-500" />
                            {MODULE_LABELS[test.module] ?? test.module}
                          </div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="px-6 sm:px-7 py-3 bg-slate-50 border-t border-b border-slate-100 flex justify-between items-center text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-slate-700">
                            {test.rating ? test.rating.toFixed(1) : "—"}
                          </span>
                        </div>
                        <div>
                          {test.usersCount ? test.usersCount.toLocaleString() : "0"} taken
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="p-6 sm:p-7 mt-auto">
                        {unlocked ? (
                          <Link
                            href={`/exam?testId=${test._id}&mode=practice`}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold transition-all group-hover:shadow-lg text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700"
                          >
                            <PlayCircle size={18} /> Start Practice
                          </Link>
                        ) : (
                          <div className="space-y-2">
                            <Link
                              href={`/login?redirect=${encodeURIComponent(`/exam?testId=${test._id}&mode=practice`)}`}
                              className="bg-white border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all hover:bg-indigo-50/40"
                            >
                              <Lock size={16} /> Login to unlock
                            </Link>
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
          <div className="text-center py-20">
            <div className="inline-flex p-4 bg-slate-100 rounded-full mb-4">
              <Filter size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No practice tests found</h3>
            <p className="text-slate-500">Admin has not added any {displayModuleName} practice tests yet.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              title="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  p === pagination.page
                    ? "bg-blue-600 text-white shadow"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              title="Next page"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
