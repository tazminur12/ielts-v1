"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [tests, setTests] = useState<Test[]>([]);
  const [accessibleSlugs, setAccessibleSlugs] = useState<string[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchTests = async (page = 1, moduleFilter = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ examType: "mock", page: String(page), limit: "12" });
      if (moduleFilter && moduleFilter !== "All") params.set("module", moduleFilter.toLowerCase().replace(" ", ""));
      const res = await fetch(`/api/tests?${params}`);
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
    fetchTests(1, filter);
  }, [filter]);

  const isUnlocked = (test: Test) => accessibleSlugs.includes(test.accessLevel) || test.accessLevel === "free";

  const TYPE_FILTERS = ["All", "Listening", "Reading", "Writing", "Speaking"];

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
        {/* Modern Filter Bar */}
        <div className="bg-white rounded-2xl p-2 sm:p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto scrollbar-hide">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-[#0f172a] text-white shadow-md"
                    : "bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
            <Filter size={16} />
            <span>Showing {pagination.total} high-quality tests</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-auto max-w-md bg-red-50 border border-red-200 text-center py-8 px-4 rounded-2xl">
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={() => fetchTests(1, filter)}
              className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
            >
              Try again
            </button>
          </div>
        )}

        {/* High-End Test Grid */}
        {!error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : tests.map((test) => {
                  const unlocked = isUnlocked(test);
                  const difficultyColor = test.difficulty 
                    ? DIFFICULTY_COLORS[test.difficulty.toLowerCase()] || "text-slate-600 bg-slate-50 border-slate-200"
                    : "text-slate-600 bg-slate-50 border-slate-200";

                  return (
                    <div
                      key={test._id}
                      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col overflow-hidden relative"
                    >
                      {/* Top Accent Line */}
                      <div className={`h-1.5 w-full ${unlocked ? 'bg-blue-600' : 'bg-slate-300'}`} />
                      
                      {/* Status Badges */}
                      <div className="absolute top-5 right-5 z-10 flex gap-2">
                        {!unlocked && (
                          <div className="bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-lg border border-slate-200 text-slate-500">
                            <Lock size={14} />
                          </div>
                        )}
                      </div>

                      <div className="p-6 pb-2 grow">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 bg-[#f0f4ff] text-blue-700 text-xs font-bold uppercase tracking-wider rounded-md">
                            {MODULE_LABELS[test.module] ?? test.module}
                          </span>
                          {test.type && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-md">
                              {test.type}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-extrabold text-[#0f172a] mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                          {test.title}
                        </h3>

                        {/* Test Meta Info */}
                        <div className="grid grid-cols-2 gap-y-3 font-medium text-slate-600 text-sm mb-6">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
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
                            <BookOpen size={16} className="text-slate-400" />
                            {test.totalQuestions ? `${test.totalQuestions} Qs` : "Standard"}
                          </div>
                        </div>
                      </div>

                      {/* Action Area */}
                      <div className="p-6 pt-0 mt-auto">
                        <div className="h-px w-full bg-slate-100 mb-4"></div>
                        {unlocked ? (
                          <Link
                            href={`/exam?testId=${test._id}`}
                            className="bg-[#0f172a] hover:bg-blue-600 text-white w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group-hover:shadow-md"
                          >
                            <PlayCircle size={20} />
                            Start Examination
                          </Link>
                        ) : (
                          <Link
                            href="/pricing"
                            className="bg-white border-2 border-slate-200 hover:border-[#0f172a] hover:text-[#0f172a] text-slate-600 w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <Lock size={18} />
                            Unlock Premium Test
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
                onClick={() => fetchTests(pagination.page - 1, filter)}
                className="p-2 sm:px-4 sm:py-2 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <span className="hidden sm:inline">Previous</span>
                <ChevronLeft size={18} className="sm:hidden" />
              </button>
              
              <div className="flex px-2 space-x-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchTests(p, filter)}
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
                onClick={() => fetchTests(pagination.page + 1, filter)}
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
