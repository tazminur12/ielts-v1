"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Lock, Play, Zap, CheckCircle, Clock,
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
  tags?: string[];
}

const MODULE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  listening: { emoji: "🎧", color: "text-blue-600", bg: "bg-blue-50" },
  reading: { emoji: "📖", color: "text-green-600", bg: "bg-green-50" },
  writing: { emoji: "✍️", color: "text-purple-600", bg: "bg-purple-50" },
  speaking: { emoji: "🎤", color: "text-orange-600", bg: "bg-orange-50" },
  full: { emoji: "📋", color: "text-gray-600", bg: "bg-gray-50" },
};

export default function PracticeTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [accessibleSlugs, setAccessibleSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState("all");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchTests = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        examType: "practice",
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

  const modules = ["all", "listening", "reading", "writing", "speaking"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Practice Tests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Module-specific practice sets with instant answer checking — no strict timer
        </p>
      </div>

      {/* Feature highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 shadow-sm">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Instant Feedback</p>
            <p className="text-xs text-gray-500">See correct answers after each question</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 shadow-sm">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">No Time Pressure</p>
            <p className="text-xs text-gray-500">Practice at your own pace</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 shadow-sm">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Targeted Skill Building</p>
            <p className="text-xs text-gray-500">Focus on your weak areas</p>
          </div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => setActiveModule(m)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
              activeModule === m
                ? "bg-purple-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {m === "all" ? "All" : `${MODULE_CONFIG[m]?.emoji} ${m}`}
          </button>
        ))}
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-44 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No practice tests available yet</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon for new practice sets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const cfg = MODULE_CONFIG[test.module] || MODULE_CONFIG.full;
            const isLocked = !accessibleSlugs.includes(test.accessLevel);

            return (
              <div
                key={test._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center text-xl shrink-0`}>
                    {cfg.emoji}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {test.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        test.difficulty === "easy" ? "bg-green-50 text-green-600"
                        : test.difficulty === "medium" ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                      }`}>
                        {test.difficulty}
                      </span>
                    )}
                    {isLocked && <Lock size={13} className="text-gray-400" />}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{test.title}</h3>
                {test.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">{test.description}</p>
                )}

                <div className="flex gap-3 text-xs text-gray-400 mb-4">
                  <span>{test.totalQuestions} questions</span>
                  {test.duration > 0 ? (
                    <span>{test.duration} min</span>
                  ) : (
                    <span className="text-green-600 font-medium">No timer</span>
                  )}
                </div>

                {isLocked ? (
                  <Link
                    href="/pricing"
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Lock size={12} />
                    Upgrade to Unlock
                  </Link>
                ) : (
                  <Link
                    href={`/exam?testId=${test._id}&mode=practice`}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Play size={12} />
                    Start Practice
                  </Link>
                )}
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
                  ? "bg-purple-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
