"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Headphones,
  PenLine,
  PlayCircle,
  Search,
  Sparkles,
  MessageSquare,
} from "lucide-react";

interface Test {
  _id: string;
  title: string;
  duration: number;
  totalQuestions: number;
  difficulty: string;
  module: string;
  examType: string;
  tags?: string[];
  accessLevel: string;
}

export default function StartMockPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [practiceTests, setPracticeTests] = useState<Test[]>([]);
  const [accessibleSlugs, setAccessibleSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Tests");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const [mockRes, practiceRes] = await Promise.all([
        fetch(`/api/tests?${new URLSearchParams({ examType: "mock", limit: "50" })}`),
        fetch(`/api/tests?${new URLSearchParams({ examType: "practice", limit: "50" })}`),
      ]);

      const mockData = await mockRes.json();
      const practiceData = await practiceRes.json();

      setTests(mockData.tests || []);
      setPracticeTests(practiceData.tests || []);

      // Both responses should have the same access metadata; prefer mock response as source of truth.
      setAccessibleSlugs(mockData.accessibleSlugs || practiceData.accessibleSlugs || []);
    } catch (err) {
      console.error("Failed to load tests", err);
    } finally {
      setLoading(false);
    }
  };

  // plan metadata retained for possible future use:
  // - show required plan badge for locked content
  // - highlight premium items in a separate section

  const freeSlugs = new Set(accessibleSlugs.length ? accessibleSlugs : ["free"]);

  const filteredTests = tests.filter(test => {
    // Only show free content on this page
    if (!freeSlugs.has(test.accessLevel) && test.accessLevel !== "free") return false;

    // Search filter
    if (search && !test.title.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Category/Module filter
    if (activeFilter !== "All Tests") {
      if (test.module.toLowerCase() !== activeFilter.toLowerCase()) return false;
    }
    
    return true;
  });

  const filteredPractice = practiceTests.filter((test) => {
    // Only show free content on this page
    if (!freeSlugs.has(test.accessLevel) && test.accessLevel !== "free") return false;
    if (search && !test.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter !== "All Tests") {
      if (test.module.toLowerCase() !== activeFilter.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pt-24 pb-16">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                <Sparkles size={14} />
                Start free, upgrade anytime
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
                Free IELTS practice + mock tests —{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600">
                  exam-ready
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mt-4 leading-relaxed">
                Choose quick <strong>practice drills</strong> to improve a single module, or take a{" "}
                <strong>full mock</strong> to simulate the real test. Premium tests are visible too —
                you can unlock them by logging in and upgrading.
              </p>

              <div className="flex flex-wrap gap-2 mt-6 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Instant access to free content
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
                  <GraduationCap size={14} className="text-indigo-600" />
                  IELTS-style experience
                </div>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-3">
              <Link
                href="/mock-tests"
                className="group rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="h-1.5 bg-linear-to-r from-sky-500 via-indigo-500 to-fuchsia-500" />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <GraduationCap size={18} className="text-indigo-700" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">Mock tests</p>
                        <p className="text-xs text-slate-500">Full exam simulations</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-700 transition-colors" />
                  </div>
                </div>
              </Link>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="h-1.5 bg-linear-to-r from-emerald-500 via-teal-500 to-sky-500" />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <BookOpen size={18} className="text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">Practice by module</p>
                        <p className="text-xs text-slate-500">Targeted drills</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/practice/listening"
                      className="px-3 py-2 rounded-2xl border border-slate-200 hover:border-sky-200 hover:bg-sky-50/40 transition-all text-sm font-bold text-slate-800 flex items-center gap-2"
                    >
                      <Headphones size={16} className="text-sky-600" /> Listening
                    </Link>
                    <Link
                      href="/practice/reading"
                      className="px-3 py-2 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all text-sm font-bold text-slate-800 flex items-center gap-2"
                    >
                      <BookOpen size={16} className="text-indigo-600" /> Reading
                    </Link>
                    <Link
                      href="/practice/writing"
                      className="px-3 py-2 rounded-2xl border border-slate-200 hover:border-fuchsia-200 hover:bg-fuchsia-50/40 transition-all text-sm font-bold text-slate-800 flex items-center gap-2"
                    >
                      <PenLine size={16} className="text-fuchsia-600" /> Writing
                    </Link>
                    <Link
                      href="/practice/speaking"
                      className="px-3 py-2 rounded-2xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/40 transition-all text-sm font-bold text-slate-800 flex items-center gap-2"
                    >
                      <MessageSquare size={16} className="text-amber-600" /> Speaking
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Free content split */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 py-10">
          {/* Free Mock */}
          <div>
            <div className="flex items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-xs font-extrabold tracking-wider uppercase text-indigo-700">
                  Free mock tests
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Full exam simulations
                </h2>
              </div>
              <Link
                href="/mock-tests"
                className="text-sm font-extrabold text-indigo-700 hover:text-indigo-800 hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
                {["All Tests", "Reading", "Listening", "Writing", "Speaking"].map((filter, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                      activeFilter === filter
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-3xl h-64 border border-slate-100" />
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-700 font-bold">No free mock tests found</p>
                <p className="text-slate-500 text-sm mt-1">Try a different module filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredTests.slice(0, 6).map((test) => (
                  <div
                    key={test._id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    <div className="h-1.5 w-full bg-linear-to-r from-sky-500 via-indigo-500 to-fuchsia-500" />
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <span className="px-3 py-1.5 bg-linear-to-r from-indigo-600 to-sky-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-sm">
                          {String(test.module || "mock").toUpperCase()}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider ${
                            (test.difficulty || "medium").toLowerCase() === "easy"
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : (test.difficulty || "medium").toLowerCase() === "hard"
                                ? "text-rose-700 bg-rose-50 border-rose-200"
                                : "text-amber-800 bg-amber-50 border-amber-200"
                          }`}
                        >
                          {test.difficulty || "medium"}
                        </span>
                      </div>

                      <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900 mb-4 line-clamp-2 leading-tight">
                        {test.title}
                      </h3>

                      <div className="grid grid-cols-2 gap-y-2 text-sm font-semibold text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-sky-500" />
                          {test.duration ? `${test.duration} mins` : "Untimed"}
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart size={16} className="text-indigo-500" />
                          {test.totalQuestions || 0} Qs
                        </div>
                      </div>
                    </div>
                    <div className="px-5 sm:px-6 pb-5">
                      <Link
                        href={`/exam?testId=${test._id}`}
                        className="w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg text-white bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700"
                      >
                        <PlayCircle size={18} /> Start free mock
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Free Practice */}
          <div>
            <div className="flex items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-xs font-extrabold tracking-wider uppercase text-emerald-700">
                  Free practice
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Targeted drills by module
                </h2>
              </div>
              <Link
                href="/practice"
                className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Search (shared) */}
            <div className="relative w-full mb-6">
              <input
                type="text"
                placeholder="Search free practice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm outline-none transition-shadow"
              />
              <div className="absolute left-4 top-3.5 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-3xl h-64 border border-slate-100" />
                ))}
              </div>
            ) : filteredPractice.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-700 font-bold">No free practice tests found</p>
                <p className="text-slate-500 text-sm mt-1">Admin has not added free practice yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredPractice.slice(0, 6).map((test) => (
                  <div
                    key={test._id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 via-teal-500 to-sky-500" />
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <span className="px-3 py-1.5 bg-linear-to-r from-emerald-600 to-sky-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-sm">
                          {String(test.module || "practice").toUpperCase()}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider ${
                            (test.difficulty || "medium").toLowerCase() === "easy"
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : (test.difficulty || "medium").toLowerCase() === "hard"
                                ? "text-rose-700 bg-rose-50 border-rose-200"
                                : "text-amber-800 bg-amber-50 border-amber-200"
                          }`}
                        >
                          {test.difficulty || "medium"}
                        </span>
                      </div>

                      <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900 mb-4 line-clamp-2 leading-tight">
                        {test.title}
                      </h3>

                      <div className="grid grid-cols-2 gap-y-2 text-sm font-semibold text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-emerald-600" />
                          {test.duration ? `${test.duration} mins` : "Untimed"}
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart size={16} className="text-sky-600" />
                          {test.totalQuestions || 0} Qs
                        </div>
                      </div>
                    </div>
                    <div className="px-5 sm:px-6 pb-5">
                      <Link
                        href={`/exam?testId=${test._id}&mode=practice`}
                        className="w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg text-white bg-linear-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:via-teal-700 hover:to-sky-700"
                      >
                        <PlayCircle size={18} /> Start free practice
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Section - Modern Cards */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm text-center">
          <div className="max-w-2xl mx-auto mb-7">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              Why take our free Mock Tests & Practice?
            </h2>
            <p className="text-slate-600 text-sm md:text-base">
              Use <strong>Practice</strong> to improve one skill fast, then validate your progress with a
              full <strong>Mock Test</strong> — the best way to build confidence for exam day.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Accurate Scoring",
                desc: "Get an estimated band score based on official IELTS marking criteria.",
                icon: <CheckCircle2 className="w-6 h-6 text-blue-600" />,
                bg: "bg-blue-50"
              },
              {
                title: "Instant Results",
                desc: "See your results immediately after finishing Listening and Reading tests.",
                icon: <PlayCircle className="w-6 h-6 text-fuchsia-600" />,
                bg: "bg-fuchsia-50"
              },
              {
                title: "Performance Analytics",
                desc: "Track your progress over time and identify areas for improvement.",
                icon: <BarChart className="w-6 h-6 text-emerald-600" />,
                bg: "bg-emerald-50"
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-12 h-12 ${feature.bg} rounded-2xl flex items-center justify-center mb-3`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
