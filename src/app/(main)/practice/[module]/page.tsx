"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  
  const [tests, setTests] = useState<Test[]>([]);
  const [accessibleSlugs, setAccessibleSlugs] = useState<string[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchTests = async (page = 1, typeFilter = "") => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams({ 
        examType: "practice", 
        page: String(page), 
        limit: "12",
        module: moduleSlug
      });
      // the filter is for tags like Academic/General
      if (typeFilter && typeFilter !== "All") queryParams.set("type", typeFilter);

      const res = await fetch(`/api/tests?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load tests");
      const data = await res.json();
      setTests(data.tests || []);
      setAccessibleSlugs(data.accessibleSlugs || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1 });
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleSlug) {
      fetchTests(1, filter);
    }
  }, [filter, moduleSlug]);

  const isUnlocked = (test: Test) => accessibleSlugs.includes(test.accessLevel);

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
            <p>{error}</p>
            <button
              onClick={() => fetchTests(1, filter)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Test Grid */}
        {!error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : tests.map((test) => {
                  const unlocked = isUnlocked(test);
                  return (
                    <div
                      key={test._id}
                      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
                    >
                      {/* Card Header */}
                      <div className="p-6 pb-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap gap-2">
                            {test.type && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded">
                                {test.type}
                              </span>
                            )}
                            {(test.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          {!unlocked && (
                            <span className="bg-amber-100 text-amber-700 p-1.5 rounded-lg shrink-0">
                              <Lock size={14} />
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {test.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-1">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDuration(test.duration)}
                          </div>
                          {test.difficulty && (
                            <div className={`flex items-center gap-1 capitalize font-medium ${DIFFICULTY_COLORS[test.difficulty] ?? "text-slate-500"}`}>
                              <BarChart size={14} />
                              {test.difficulty}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-slate-400">
                            <BookOpen size={14} />
                            {MODULE_LABELS[test.module] ?? test.module}
                          </div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="px-6 py-3 bg-slate-50 border-t border-b border-slate-100 flex justify-between items-center text-xs font-medium text-slate-500">
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
                      <div className="p-6 mt-auto">
                        {unlocked ? (
                          <Link
                            href={`/exam?testId=${test._id}&mode=practice`}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                          >
                            <PlayCircle size={18} /> Start Practice
                          </Link>
                        ) : (
                          <Link
                            href="/pricing"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 hover:border-blue-600 text-slate-700 hover:text-blue-600 font-bold rounded-xl transition-all"
                          >
                            <Lock size={16} /> Unlock Premium
                          </Link>
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
              onClick={() => fetchTests(pagination.page - 1, filter)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchTests(p, filter)}
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
              onClick={() => fetchTests(pagination.page + 1, filter)}
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
