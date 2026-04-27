"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DollarSign, Star, TrendingUp, UserPlus, LayoutGrid } from "lucide-react";

type Point = { label: string; value: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function useCountUp(target: number, durationMs = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const to = Number.isFinite(target) ? target : 0;

    const tick = (t: number) => {
      const p = clamp((t - start) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return val;
}

function StatCard({
  label,
  value,
  icon,
  tone = "dark",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "dark" | "light";
}) {
  const base =
    tone === "dark"
      ? "bg-slate-900 text-white border-slate-800"
      : "bg-white text-slate-900 border-slate-200";
  const labelCls = tone === "dark" ? "text-slate-200" : "text-slate-500";
  return (
    <div className={`rounded-2xl border ${base} shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-extrabold uppercase tracking-widest ${labelCls}`}>
            {label}
          </p>
          <p className="text-2xl font-black tabular-nums mt-2">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart({ points }: { points: Point[] }) {
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.value)), [points]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">Result</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Attempts trend (last 7 days)
          </p>
        </div>
        <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          Max {max}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-7 gap-3 items-end h-40">
          {points.map((p, i) => {
            const pct = (p.value / max) * 100;
            return (
              <div key={p.label + i} className="flex flex-col items-center gap-2">
                <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl flex items-end overflow-hidden">
                  <div
                    className="w-full bg-linear-to-t from-sky-500 via-indigo-500 to-fuchsia-500 rounded-xl"
                    style={{ height: `${pct}%` }}
                    title={`${p.label}: ${p.value}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AreaChart({ points }: { points: Point[] }) {
  const { path, area } = useMemo(() => {
    const w = 520;
    const h = 140;
    const padX = 10;
    const padY = 14;
    const vals = points.map((p) => p.value);
    const max = Math.max(1, ...vals);
    const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * (w - padX * 2) + padX);
    const ys = vals.map((v) => h - padY - (v / max) * (h - padY * 2));
    const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
    const lastX = xs[xs.length - 1] ?? padX;
    const areaPath = `${line} L ${lastX} ${h - padY} L ${xs[0]} ${h - padY} Z`;
    return { path: line, area: areaPath };
  }, [points]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">Engagement</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Smooth activity curve (7 days)
          </p>
        </div>
        <TrendingUp className="w-4 h-4 text-slate-400" />
      </div>
      <div className="p-5">
        <svg viewBox="0 0 520 140" className="w-full h-36">
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#areaFill)" />
          <path d={path} fill="none" stroke="url(#areaLine)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span>{points[0]?.label}</span>
          <span>{points[points.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

function Donut({
  label,
  pct,
}: {
  label: string;
  pct: number;
}) {
  const p = clamp(pct, 0, 100);
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  const offset = c - dash;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Conversion snapshot</p>
        </div>
        <Star className="w-4 h-4 text-slate-400" />
      </div>
      <div className="p-6 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="url(#donut)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${offset}`}
            />
            <defs>
              <linearGradient id="donut" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{Math.round(p)}%</p>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardProPanel({
  mrrMonthly,
  newUsers7d,
  activeSubs,
  avgTestRating,
  attempts7d,
  registrations7d,
}: {
  mrrMonthly: number;
  newUsers7d: number;
  activeSubs: number;
  avgTestRating: number | null;
  attempts7d: Point[];
  registrations7d: Point[];
}) {
  const earning = useCountUp(Math.round(mrrMonthly));
  const newUsers = useCountUp(newUsers7d);
  const activeSubsAnim = useCountUp(activeSubs);
  const ratingText = avgTestRating != null ? avgTestRating.toFixed(1) : "—";
  const conversion = newUsers7d > 0 ? (activeSubs / Math.max(1, newUsers7d)) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="MRR (est.)"
          value={`$ ${earning}`}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          tone="dark"
        />
        <StatCard
          label="New users (7d)"
          value={`${newUsers}`}
          icon={<UserPlus className="w-5 h-5 text-slate-700" />}
          tone="light"
        />
        <StatCard
          label="Active subs"
          value={`${activeSubsAnim}`}
          icon={<LayoutGrid className="w-5 h-5 text-slate-700" />}
          tone="light"
        />
        <StatCard
          label="Rating"
          value={ratingText}
          icon={<Star className="w-5 h-5 text-amber-500" />}
          tone="light"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <BarChart points={attempts7d} />
        </div>
        <div className="xl:col-span-4 space-y-4">
          <Donut label="Active conversion" pct={conversion} />
          <AreaChart points={registrations7d} />
        </div>
      </div>
    </div>
  );
}

