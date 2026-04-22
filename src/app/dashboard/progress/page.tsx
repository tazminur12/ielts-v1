"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  BarChart3,
  BookOpen,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";

type AttemptStatus = "in_progress" | "submitted" | "evaluated";

type SectionBands = {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
};

type Attempt = {
  _id: string;
  module: string;
  examType: "mock" | "practice";
  status: AttemptStatus;
  bandScore?: number;
  overallBand?: number;
  sectionBands?: SectionBands;
  startedAt: string;
  submittedAt?: string;
  testId?: { _id: string; title?: string; module?: string; examType?: string };
};

function safeBand(n: unknown): number | null {
  const v = typeof n === "number" && Number.isFinite(n) ? n : null;
  if (v == null) return null;
  if (v < 0) return 0;
  if (v > 9) return 9;
  return v;
}

function roundToIeltsHalfBand(avg: number): number {
  const clamped = Math.min(9, Math.max(0, avg));
  const base = Math.floor(clamped);
  const frac = clamped - base;
  if (frac < 0.25) return base;
  if (frac < 0.75) return base + 0.5;
  return base + 1;
}

function deriveOverall(a: Attempt): number | null {
  const direct = safeBand(a.overallBand ?? a.bandScore);
  if (direct != null) return direct;
  const sb = a.sectionBands;
  if (!sb) return null;
  const parts = [sb.listening, sb.reading, sb.writing, sb.speaking]
    .map(safeBand)
    .filter((v): v is number => v != null);
  if (parts.length !== 4) return null;
  const avg = parts.reduce((x, y) => x + y, 0) / 4;
  return roundToIeltsHalfBand(avg);
}

function moduleLabel(module: string) {
  if (module === "full") return "Full mock";
  return module.charAt(0).toUpperCase() + module.slice(1);
}

function moduleTone(module: string) {
  if (module === "listening") return "bg-blue-50 text-blue-800 border-blue-200";
  if (module === "reading") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (module === "writing") return "bg-amber-50 text-amber-900 border-amber-200";
  if (module === "speaking") return "bg-rose-50 text-rose-800 border-rose-200";
  if (module === "full") return "bg-indigo-50 text-indigo-800 border-indigo-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function statusTone(status: AttemptStatus) {
  if (status === "evaluated") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "submitted") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "evaluated" | "submitted">("all");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ limit: "200" });
        if (statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/attempts?${params}`);
        if (!res.ok) throw new Error("Failed to load progress");
        const data = await res.json();
        const raw: Attempt[] = data.attempts ?? [];
        setAttempts(raw.filter((a) => a.status !== "in_progress"));
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attempts.filter((a) => {
      if (moduleFilter && a.module !== moduleFilter) return false;
      if (!q) return true;
      const title = a.testId?.title ?? "";
      const hay = `${title} ${a.module} ${a.examType} ${a.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [attempts, search, moduleFilter]);

  const evaluated = useMemo(
    () => attempts.filter((a) => a.status === "evaluated" && deriveOverall(a) != null),
    [attempts]
  );

  const avgOverall = useMemo(() => {
    if (evaluated.length === 0) return null;
    const vals = evaluated.map((a) => deriveOverall(a)!).filter((v) => Number.isFinite(v));
    if (vals.length === 0) return null;
    const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
    return roundToIeltsHalfBand(avg);
  }, [evaluated]);

  const bestOverall = useMemo(() => {
    const vals = evaluated.map((a) => deriveOverall(a)!).filter((v) => Number.isFinite(v));
    if (vals.length === 0) return null;
    return Math.max(...vals);
  }, [evaluated]);

  const lastEvaluated = useMemo(() => {
    const sorted = [...evaluated].sort(
      (a, b) =>
        new Date(b.submittedAt ?? b.startedAt).getTime() -
        new Date(a.submittedAt ?? a.startedAt).getTime()
    );
    return sorted[0] ?? null;
  }, [evaluated]);

  const moduleAverages = useMemo(() => {
    const buckets: Record<string, number[]> = {
      listening: [],
      reading: [],
      writing: [],
      speaking: [],
      full: [],
    };
    for (const a of evaluated) {
      if (a.module === "full") {
        const o = deriveOverall(a);
        if (o != null) buckets.full.push(o);
        const sb = a.sectionBands;
        if (sb) {
          const l = safeBand(sb.listening);
          const r = safeBand(sb.reading);
          const w = safeBand(sb.writing);
          const s = safeBand(sb.speaking);
          if (l != null) buckets.listening.push(l);
          if (r != null) buckets.reading.push(r);
          if (w != null) buckets.writing.push(w);
          if (s != null) buckets.speaking.push(s);
        }
      } else {
        const b = safeBand(a.bandScore ?? a.overallBand);
        if (b != null && buckets[a.module]) buckets[a.module].push(b);
      }
    }
    const out: Record<string, number | null> = {};
    for (const [k, vals] of Object.entries(buckets)) {
      if (vals.length === 0) out[k] = null;
      else out[k] = roundToIeltsHalfBand(vals.reduce((x, y) => x + y, 0) / vals.length);
    }
    return out;
  }, [evaluated]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Progress
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Track your estimated band progression over time. Scores here are for practice and are not official IELTS results.
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
          <span className="font-semibold text-slate-800">International policy note:</span> IELTS is
          a registered trademark of its respective owners. This dashboard shows practice attempts
          and estimated scores for learning. When four skill bands are available for a full mock,
          the overall band is displayed using the common convention: average rounded to the nearest
          0.5 (0.25→0.5, 0.75→next whole band).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Average overall</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : avgOverall ?? "—"}
          </p>
          <p className="text-xs text-slate-500 mt-2">Evaluated attempts only</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Best overall</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : bestOverall ?? "—"}
          </p>
          <p className="text-xs text-slate-500 mt-2">Highest recorded overall</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <p className="text-sm font-medium text-slate-500">Last evaluated</p>
          <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
            {loading ? "—" : (lastEvaluated ? deriveOverall(lastEvaluated) : "—")}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {loading
              ? "—"
              : lastEvaluated
              ? `${moduleLabel(lastEvaluated.module)} · ${formatDate(
                  lastEvaluated.submittedAt ?? lastEvaluated.startedAt
                )}`
              : "No evaluated attempts yet"}
          </p>
        </div>
      </div>

      {/* Module averages */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Module overview</p>
            <p className="text-xs text-slate-500 mt-0.5">Averages are shown as nearest 0.5.</p>
          </div>
          <div className="text-xs text-slate-500">{loading ? "Loading…" : `${evaluated.length} evaluated`}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-100">
          {(["listening", "reading", "writing", "speaking", "full"] as const).map((m) => (
            <div key={m} className="bg-white p-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold uppercase tracking-wide ${moduleTone(m)}`}>
                  {moduleLabel(m)}
                </span>
                <BarChart3 className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-900 tabular-nums mt-3">
                {loading ? "—" : (moduleAverages[m] ?? "—")}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {m === "full" ? "Overall from full mocks" : "Single module or full-mock sections"}
              </p>
            </div>
          ))}
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
              placeholder="Search by test title, module, status..."
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
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All status</option>
            <option value="evaluated">Evaluated</option>
            <option value="submitted">Submitted</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setModuleFilter("");
              setStatusFilter("all");
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
          <p className="text-sm font-medium text-rose-700">{error}</p>
          <button
            onClick={() => setStatusFilter((s) => s)}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Timeline */}
      {!error && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recent attempts</p>
              <p className="text-xs text-slate-500 mt-0.5">Open any attempt for the detailed report.</p>
            </div>
            <div className="text-xs text-slate-500">{loading ? "Loading…" : `${filtered.length} shown`}</div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading progress…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="inline-flex p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
                <TrendingUp size={26} />
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-4">No attempts found</p>
              <p className="text-sm text-slate-600 mt-1">
                Take a mock test to start tracking your progress here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.submittedAt ?? b.startedAt).getTime() -
                    new Date(a.submittedAt ?? a.startedAt).getTime()
                )
                .map((a) => {
                  const overall = deriveOverall(a);
                  const title = a.testId?.title ?? `${moduleLabel(a.module)} (${a.examType})`;
                  const date = formatDate(a.submittedAt ?? a.startedAt);
                  return (
                    <div key={a._id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${moduleTone(a.module)}`}>
                              {moduleLabel(a.module)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${statusTone(a.status)}`}>
                              {a.status === "evaluated" ? "Evaluated" : "Submitted"}
                            </span>
                            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                              <Calendar size={14} className="text-slate-400" />
                              {date}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{title}</p>

                          {a.module === "full" && a.sectionBands && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                                L: {safeBand(a.sectionBands.listening) ?? "—"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                                R: {safeBand(a.sectionBands.reading) ?? "—"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                                W: {safeBand(a.sectionBands.writing) ?? "—"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
                                S: {safeBand(a.sectionBands.speaking) ?? "—"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall</p>
                            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{overall ?? "—"}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-200" />
                          <Link
                            href={`/exam/results?attemptId=${a._id}`}
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
      )}
    </div>
  );
}
