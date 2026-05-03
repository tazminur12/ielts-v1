"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, BarChart3, Loader2, Target, Users } from "lucide-react";

type AdminAnalytics = {
  totals: {
    totalUsers: number;
    attemptsWeek: number;
    attemptsMonth: number;
  };
  engagement: {
    activeUsers7d: number;
    completionRate7d: number;
    completionRate30d: number;
  };
  averageBandPerTest: Array<{
    testId: string;
    title: string;
    module: string;
    examType: string;
    avgBand: number;
    attempts: number;
  }>;
  mostAttemptedTests: Array<{ testId: string; title: string; count: number }>;
  questionErrors: Array<{
    questionId: string;
    questionNumber?: number;
    questionType?: string;
    questionText?: string;
    wrong: number;
  }>;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/analytics");
        const payload = await res.json();
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load analytics");
        }
        setData(payload.data);
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avgBandChart = useMemo(() => {
    return (data?.averageBandPerTest || []).slice(0, 10).map((x) => ({
      name: x.title.length > 18 ? `${x.title.slice(0, 18)}…` : x.title,
      band: x.avgBand,
      attempts: x.attempts,
    }));
  }, [data]);

  const mostAttemptedChart = useMemo(() => {
    return (data?.mostAttemptedTests || []).slice(0, 10).map((x) => ({
      name: x.title.length > 18 ? `${x.title.slice(0, 18)}…` : x.title,
      count: x.count,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
        <div>
          <p className="text-sm font-extrabold text-rose-800">Failed to load</p>
          <p className="text-sm font-medium text-rose-700 mt-1">{error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
          Analytics
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Students" value={String(data.totals.totalUsers)} icon={<Users className="w-5 h-5 text-blue-700" />} />
        <MetricCard label="Attempts (7d)" value={String(data.totals.attemptsWeek)} icon={<Target className="w-5 h-5 text-emerald-700" />} />
        <MetricCard label="Attempts (30d)" value={String(data.totals.attemptsMonth)} icon={<Target className="w-5 h-5 text-amber-700" />} />
        <MetricCard label="Active users (7d)" value={String(data.engagement.activeUsers7d)} icon={<Users className="w-5 h-5 text-slate-700" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Average band per test</p>
              <p className="text-xs text-slate-500 mt-1">Top 10 by attempt volume</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgBandChart} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 9]} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="band" fill="#1a3a5c" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Most attempted tests</p>
              <p className="text-xs text-slate-500 mt-1">Top 10</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostAttemptedChart} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#334155" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-extrabold text-slate-900">Highest error-rate questions (by wrong answers)</p>
          <p className="text-xs text-slate-500 mt-1">Top 15</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">Wrong</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {(data.questionErrors || []).map((q) => (
                <tr key={q.questionId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-extrabold text-slate-900">
                      {q.questionNumber ? `Q${q.questionNumber}` : "Q"}{" "}
                      {q.questionText ? q.questionText.slice(0, 90) : "—"}
                      {q.questionText && q.questionText.length > 90 ? "…" : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-semibold capitalize">
                    {(q.questionType || "").replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                    {q.wrong}
                  </td>
                </tr>
              ))}
              {(!data.questionErrors || data.questionErrors.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
