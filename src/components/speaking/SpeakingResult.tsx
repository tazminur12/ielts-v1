"use client";

import { useMemo } from "react";

export type SpeakingCriteriaScores = {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  pronunciation: number;
};

export type SpeakingPartResult = {
  partNumber: 1 | 2 | 3;
  prompt: string;
  transcript: string;
  overallBand: number;
  criteria: SpeakingCriteriaScores;
  feedback: string;
  suggestions: string[];
};

export default function SpeakingResult(props: { parts: SpeakingPartResult[] }) {
  const { parts } = props;

  const overall = useMemo(() => {
    const bands = parts.map((p) => p.overallBand).filter((b) => Number.isFinite(b));
    if (bands.length === 0) return 0;
    return Math.round(((bands.reduce((s, v) => s + v, 0) / bands.length) * 2)) / 2;
  }, [parts]);

  const aggregateCriteria = useMemo(() => {
    const avg = (values: number[]) => {
      const vs = values.filter((v) => Number.isFinite(v));
      if (vs.length === 0) return 0;
      return Math.round(((vs.reduce((s, v) => s + v, 0) / vs.length) * 2)) / 2;
    };
    return {
      fluencyCoherence: avg(parts.map((p) => p.criteria.fluencyCoherence)),
      lexicalResource: avg(parts.map((p) => p.criteria.lexicalResource)),
      grammaticalRange: avg(parts.map((p) => p.criteria.grammaticalRange)),
      pronunciation: avg(parts.map((p) => p.criteria.pronunciation)),
    };
  }, [parts]);

  const mergedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of parts) {
      for (const s of p.suggestions || []) {
        const v = String(s || "").trim();
        if (!v) continue;
        const k = v.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(v);
      }
    }
    return out.slice(0, 12);
  }, [parts]);

  if (!parts || parts.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Speaking evaluation
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          Overall band: <span className="tabular-nums">{overall}</span>
        </h2>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BandCard label="Fluency" value={aggregateCriteria.fluencyCoherence} />
          <BandCard label="Lexical" value={aggregateCriteria.lexicalResource} />
          <BandCard label="Grammar" value={aggregateCriteria.grammaticalRange} />
          <BandCard label="Pronunciation" value={aggregateCriteria.pronunciation} />
        </div>
      </div>

      <div className="space-y-4">
        {parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => (
            <div key={`${p.partNumber}-${p.prompt}`} className="rounded-4xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                    Part {p.partNumber}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">Band: <span className="tabular-nums">{p.overallBand}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-extrabold text-slate-700">
                  <MiniScore label="Fluency" value={p.criteria.fluencyCoherence} />
                  <MiniScore label="Lexical" value={p.criteria.lexicalResource} />
                  <MiniScore label="Grammar" value={p.criteria.grammaticalRange} />
                  <MiniScore label="Pron." value={p.criteria.pronunciation} />
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Prompt</p>
                  <p className="mt-2 text-sm text-slate-800 font-semibold whitespace-pre-wrap">{p.prompt}</p>
                </div>

                <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
                    Transcript
                  </summary>
                  <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                    {p.transcript}
                  </div>
                </details>

                <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
                    Feedback
                  </summary>
                  <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                    {p.feedback}
                  </div>
                </details>

                {p.suggestions?.length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Suggestions
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">
                      {p.suggestions.map((s, idx) => (
                        <li key={`${p.partNumber}-${idx}-${s}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {mergedSuggestions.length > 0 && (
        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Overall improvements
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">
            {mergedSuggestions.map((s, idx) => (
              <li key={`${idx}-${s}`}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function BandCard({ label, value }: { label: string; value: number }) {
  const c = bandColor(value);
  return (
    <div className={`rounded-4xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-widest ${c.label}`}>{label}</p>
          <p className={`text-2xl font-extrabold tabular-nums mt-1 ${c.value}`}>{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-3xl border ${c.border} ${c.badgeBg} flex items-center justify-center`}>
          <span className={`text-sm font-extrabold tabular-nums ${c.value}`}>{value}</span>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden border border-white/60">
        <div
          className={`h-full ${c.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, (value / 9) * 100))}%` }}
        />
      </div>
    </div>
  );
}

function bandColor(band: number) {
  if (band >= 7) {
    return {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      badgeBg: "bg-emerald-100/60",
      bar: "bg-emerald-500",
      label: "text-emerald-700",
      value: "text-emerald-800",
    };
  }
  if (band >= 5.5) {
    return {
      border: "border-amber-200",
      bg: "bg-amber-50",
      badgeBg: "bg-amber-100/60",
      bar: "bg-amber-500",
      label: "text-amber-700",
      value: "text-amber-800",
    };
  }
  return {
    border: "border-rose-200",
    bg: "bg-rose-50",
    badgeBg: "bg-rose-100/60",
    bar: "bg-rose-500",
    label: "text-rose-700",
    value: "text-rose-800",
  };
}

