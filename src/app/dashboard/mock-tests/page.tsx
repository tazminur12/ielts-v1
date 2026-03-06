"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock, BookOpen, Star, Lock, Play, ChevronRight, Trophy,
} from "lucide-react";

interface Test {
  _id: string;
  title: string;
  description?: string;
  module: string;
  accessLevel: string;
  duration: number;
  totalQuestions: number;
  difficulty?: string;
  targetBand?: number;
  tags?: string[];
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  listening: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  reading: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  writing: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  speaking: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  full: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

const MODULE_EMOJI: Record<string, string> = {
  listening: "🎧",
  reading: "📖",
  writing: "✍️",
  speaking: "🎤",
  full: "📋",
};

export default function MockTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [accessibleSlugs, setAccessibleSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState("all");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchTests = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        examType: "mock",
        page: String(page),
        limit: "12",
      });
      if (activeModule !== "all") params.set("module", activeModule);

      const res = await fetch(`/api/tests?${params}`);
      const data = await res.json();
      setTests(data.tests || []);
      setAccessibleSlugs(data.accessibleSlugs || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  const modules = ["all", "listening", "reading", "writing", "speaking", "full"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mock Tests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Full-length IELTS mock exams with timed conditions and band scoring
        </p>
      </div>

      {/* Module Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => setActiveModule(m)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
              activeModule === m
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m === "all" ? "All Modules" : `${MODULE_EMOJI[m]} ${m}`}
          </button>
        ))}
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No mock tests available yet</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon for new tests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const colors = MODULE_COLORS[test.module] || MODULE_COLORS.full;
            const isLocked = !accessibleSlugs.includes(test.accessLevel);

            return (
              <div
                key={test._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className={`${colors.bg} px-5 pt-5 pb-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                        {MODULE_EMOJI[test.module]} {test.module} {test.module !== "full" ? "module" : "mock"}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-1 line-clamp-2">
                        {test.title}
                      </h3>
                    </div>
                    {isLocked && (
                      <span className="shrink-0 ml-2 p-1.5 bg-white/70 rounded-lg">
                        <Lock size={14} className="text-gray-500" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  {test.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{test.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {test.duration ? `${test.duration} min` : "No timer"}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {test.totalQuestions} questions
                    </span>
                    {test.targetBand && (
                      <span className="flex items-center gap-1">
                        <Trophy size={12} />
                        Band {test.targetBand}
                      </span>
                    )}
                    {test.difficulty && (
                      <span className={`capitalize px-2 py-0.5 rounded-full font-medium ${
                        test.difficulty === "easy" ? "bg-green-50 text-green-600"
                        : test.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                      }`}>
                        {test.difficulty}
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <Link
                      href="/pricing"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Lock size={14} />
                      Upgrade to Access
                    </Link>
                  ) : (
                    <Link
                      href={`/exam?testId=${test._id}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Play size={14} />
                      Start Mock Test
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchTests(p)}
              className={`w-9 h-9 text-sm rounded-lg font-medium ${
                p === pagination.page
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4">
        <Star className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-blue-900">How Mock Tests Work</p>
          <p className="text-sm text-blue-700 mt-1">
            Mock tests simulate real IELTS exam conditions. Timer starts when you begin.
            After submission, you receive an instant band score with detailed feedback.
            Writing and Speaking tasks are evaluated by AI.
          </p>
          <Link href="/about" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-2 hover:underline">
            Learn more <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
