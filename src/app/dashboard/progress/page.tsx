"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  AlertCircle,
  Award,
  Calendar,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";

type Attempt = {
  _id: string;
  module: string;
  examType: "mock" | "practice";
  status: "submitted" | "evaluated";
  bandScore?: number;
  overallBand?: number;
  sectionBands?: { listening?: number; reading?: number; writing?: number; speaking?: number };
  createdAt: string;
  submittedAt?: string;
  testId?: { title?: string; module?: string; examType?: string; type?: string };
};

type AnalyticsPayload = {
  attempts: Attempt[];
  trend: Array<{
    attemptId: string;
    date: string;
    overall: number | null;
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
    module: string;
    examType: string;
    title: string;
  }>;
  sectionAverages: { listening: number | null; reading: number | null; writing: number | null; speaking: number | null };
  weakness: {
    weakestSection: string | null;
    questionTypeErrors: Array<{ _id: string; wrong: number }>;
    recommendations: string[];
  };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function moduleTone(module: string) {
  if (module === "listening") return "bg-blue-50 text-blue-800 border-blue-200";
  if (module === "reading") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (module === "writing") return "bg-amber-50 text-amber-900 border-amber-200";
  if (module === "speaking") return "bg-rose-50 text-rose-800 border-rose-200";
  if (module === "full") return "bg-indigo-50 text-indigo-800 border-indigo-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusTone(status: string) {
  if (status === "evaluated") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-amber-50 text-amber-900 border-amber-200";
}

function moduleLabel(module: string) {
  if (module === "full") return "Full mock";
  return module.charAt(0).toUpperCase() + module.slice(1);
}

export default function ProgressPage() {
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set("module", moduleFilter);
      if (examTypeFilter) params.set("examType", examTypeFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/analytics/student?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load analytics");
      setPayload(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [examTypeFilter, from, moduleFilter, to]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const attempts = payload?.attempts ?? [];
    if (!q) return attempts;
    return attempts.filter((a) => {
      const title = a.testId?.title ?? "";
      const hay = `${title} ${a.module} ${a.examType} ${a.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [payload, search]);

  const sectionAvgChart = useMemo(() => {
    const s = payload?.sectionAverages;
    if (!s) return [];
    return [
      { name: "Listening", band: s.listening },
      { name: "Reading", band: s.reading },
      { name: "Writing", band: s.writing },
      { name: "Speaking", band: s.speaking },
    ].filter((x) => typeof x.band === "number");
  }, [payload]);

  const trendChart = useMemo(() => {
    const trend = payload?.trend ?? [];
    return trend.map((t) => ({
      name: formatDate(t.date),
      Overall: t.overall ?? undefined,
      Listening: t.listening ?? undefined,
      Reading: t.reading ?? undefined,
      Writing: t.writing ?? undefined,
      Speaking: t.speaking ?? undefined,
    }));
  }, [payload]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Band trends, skill breakdown, and weaknesses across your recent attempts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/mock-tests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <Target className="w-4 h-4" />
            Take a mock test
          </Link>
          <Link
            href="/dashboard/students/results"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Award className="w-4 h-4 text-slate-500" />
            View results
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Note:</span> Scores shown here are practice estimates. Overall band is shown using the common convention: average rounded to the nearest 0.5 when multiple skill bands exist.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attempts..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            aria-label="Filter by module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All modules</option>
            <option value="full">Full mock</option>
            <option value="listening">Listening</option>
            <option value="reading">Reading</option>
            <option value="writing">Writing</option>
            <option value="speaking">Speaking</option>
          </select>
          <select
            aria-label="Filter by test type"
            value={examTypeFilter}
            onChange={(e) => setExamTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            <option value="mock">Mock</option>
            <option value="practice">Practice</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setSearch("");
              setModuleFilter("");
              setExamTypeFilter("");
              setFrom("");
              setTo("");
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            type="button"
          >
            <Filter size={16} />
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-extrabold text-rose-800">Failed to load analytics</p>
            <p className="text-sm font-medium text-rose-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Loading analytics…</p>
          </div>
        </div>
      ) : payload ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Band score trend (last 10)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Overall" stroke="#1a3a5c" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Listening" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Reading" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Writing" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Speaking" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Section performance (average)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionAvgChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" domain={[0, 9]} />
                    <YAxis type="category" dataKey="name" width={90} />
                    <Tooltip />
                    <Bar dataKey="band" fill="#334155" radius={[8, 8, 8, 8]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Weakness analysis</h3>
                <p className="text-sm text-slate-500 mt-1">Based on your filtered attempts.</p>
              </div>
              {payload.weakness.weakestSection && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border border-rose-200 bg-rose-50 text-rose-700">
                  Weakest: {payload.weakness.weakestSection}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Most errors (question types)</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 font-medium">
                  {(payload.weakness.questionTypeErrors || []).slice(0, 6).map((x) => (
                    <li key={x._id} className="flex items-center justify-between">
                      <span className="capitalize">{String(x._id).replace(/_/g, " ")}</span>
                      <span className="font-extrabold tabular-nums">{x.wrong}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Recommendations</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">
                  {(payload.weakness.recommendations || []).map((r, idx) => (
                    <li key={`${idx}-${r}`}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Attempt history</p>
                <p className="text-xs text-slate-500 mt-0.5">Open any attempt for detailed report.</p>
              </div>
              <div className="text-xs text-slate-500">{`${filtered.length} shown`}</div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="inline-flex p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
                  <TrendingUp size={26} />
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-4">No attempts found</p>
                <p className="text-sm text-slate-600 mt-1">Try changing filters or take a test.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((a) => {
                  const title = a.testId?.title ?? `${moduleLabel(a.module)} (${a.examType})`;
                  const date = formatDate(a.submittedAt ?? a.createdAt);
                  const overall = typeof a.overallBand === "number" ? a.overallBand : typeof a.bandScore === "number" ? a.bandScore : null;
                  return (
                    <div key={a._id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${moduleTone(a.module)}`}>
                              {moduleLabel(a.module)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${statusTone(a.status)}`}>
                              {a.status}
                            </span>
                            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                              <Calendar size={14} className="text-slate-400" />
                              {date}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{title}</p>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall</p>
                            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{overall ?? "—"}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-200" />
                          <Link
                            href={`/results/${a._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                          >
                            <ExternalLink size={14} />
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
