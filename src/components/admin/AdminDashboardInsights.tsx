"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, TrendingUp, Users } from "lucide-react";

type Point = { label: string; value: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function useCountUp(target: number, durationMs = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number.isFinite(target) ? target : 0;

    const tick = (t: number) => {
      const p = clamp((t - start) / durationMs, 0, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return val;
}

function Sparkline({ points, title = "Attempts (7d)" }: { points: Point[]; title?: string }) {
  const { d, max } = useMemo(() => {
    const vals = points.map((p) => p.value);
    const mx = Math.max(1, ...vals);
    const w = 220;
    const h = 56;
    const pad = 6;
    const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * (w - pad * 2) + pad);
    const ys = vals.map((v) => h - pad - (v / mx) * (h - pad * 2));
    const path = xs
      .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
      .join(" ");
    return { d: path, max: mx };
  }, [points]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            {title}
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            Trend vs last 7 days
          </p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Max {max}
        </div>
      </div>

      <svg viewBox="0 0 220 56" className="mt-3 w-full h-14">
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="url(#spark)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 600, strokeDashoffset: 600, animation: "dash 900ms ease-out forwards" }}
        />
      </svg>

      <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-medium">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

function MiniBars({ points, title = "Daily activity" }: { points: Point[]; title?: string }) {
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.value)), [points]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{title}</p>
        <Activity className="w-4 h-4 text-slate-400" />
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 items-end h-16">
        {points.map((p, i) => {
          const h = (p.value / max) * 100;
          return (
            <div key={p.label + i} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-lg bg-slate-100 overflow-hidden h-16 flex items-end">
                <div
                  className="w-full rounded-lg bg-linear-to-t from-sky-500 via-indigo-500 to-fuchsia-500"
                  style={{
                    height: `${h}%`,
                    animation: `grow 700ms ease-out ${i * 60}ms both`,
                  }}
                  title={`${p.label}: ${p.value}`}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{p.label}</span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes grow {
          from {
            transform: scaleY(0.2);
            transform-origin: bottom;
          }
          to {
            transform: scaleY(1);
            transform-origin: bottom;
          }
        }
      `}</style>
    </div>
  );
}

export function AdminDashboardInsights({
  attempts7d,
  totalUsers,
  activeSubs,
  studentsCount,
  trialSubs,
  publishedTests,
  mockPublished,
  practicePublished,
  draftTests,
  registrations7d,
}: {
  attempts7d: Point[];
  totalUsers: number;
  activeSubs: number;
  studentsCount: number;
  trialSubs: number;
  publishedTests: number;
  mockPublished: number;
  practicePublished: number;
  draftTests: number;
  registrations7d: Point[];
}) {
  const totalUsersAnim = useCountUp(totalUsers);
  const activeSubsAnim = useCountUp(activeSubs);

  const attemptsTotal = useMemo(
    () => attempts7d.reduce((acc, p) => acc + (Number(p.value) || 0), 0),
    [attempts7d]
  );
  const attemptsTotalAnim = useCountUp(attemptsTotal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Users
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900 mt-1">
                {totalUsersAnim}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-2">
                {studentsCount} students
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Active access
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900 mt-1">
                {activeSubsAnim}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-2">
                {trialSubs} trials running
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Published tests
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900 mt-1">
                {publishedTests}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-2">
                {mockPublished} mock · {practicePublished} practice · {draftTests} drafts
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
                Attempts (7d total)
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-white mt-1">
                {attemptsTotalAnim}
              </p>
              <p className="text-xs text-slate-300 font-medium mt-2">
                Completed starts over the last week
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-sky-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <Sparkline points={attempts7d} title="Attempts (7d)" />
      </div>
      <div className="lg:col-span-3">
        <MiniBars points={attempts7d} title="Attempts by day" />
      </div>

      <div className="lg:col-span-6">
        <Sparkline points={registrations7d} title="Registrations (7d)" />
      </div>
      <div className="lg:col-span-6">
        <MiniBars points={registrations7d} title="Registrations by day" />
      </div>
    </div>
  );
}

