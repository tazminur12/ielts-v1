"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export type WritingEvaluation = {
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
  overallBand: number;
  feedback: string;
  suggestions: string[];
  evaluatedAt?: string | Date;
  evaluatedBy?: "ai" | "manual";
  examinerNotes?: string;
};

export default function WritingResult(props: {
  evaluation: WritingEvaluation | null | undefined;
  answerId?: string;
  canRequestManualReview?: boolean;
  onRequestedManualReview?: () => void;
}) {
  const { evaluation, answerId, canRequestManualReview, onRequestedManualReview } = props;
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  const sections = useMemo(() => parseFeedbackSections(evaluation?.feedback || ""), [evaluation?.feedback]);

  if (!evaluation) {
    return null;
  }

  const requestManualReview = async () => {
    if (!answerId) return;
    setRequesting(true);
    setRequestError("");
    setRequestSuccess("");
    try {
      const res = await fetch("/api/writing/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to request manual review");
      }
      setRequestSuccess("Manual review requested");
      onRequestedManualReview?.();
    } catch (err: any) {
      setRequestError(err?.message || "Failed to request manual review");
    } finally {
      setRequesting(false);
      setTimeout(() => setRequestSuccess(""), 3000);
    }
  };

  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Writing evaluation
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            Overall band: <span className="tabular-nums">{evaluation.overallBand}</span>
          </h2>
        </div>
        {canRequestManualReview && answerId && (
          <button
            type="button"
            onClick={requestManualReview}
            disabled={requesting}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {requesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting…
              </>
            ) : (
              "Request manual review"
            )}
          </button>
        )}
      </div>

      {(requestError || requestSuccess) && (
        <div
          className={`rounded-3xl border px-4 py-4 flex items-start gap-3 ${
            requestError
              ? "border-rose-200 bg-rose-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          {requestError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
          )}
          <div>
            <p
              className={`text-sm font-extrabold ${
                requestError ? "text-rose-800" : "text-emerald-800"
              }`}
            >
              {requestError ? "Request failed" : "Success"}
            </p>
            <p
              className={`text-sm font-medium mt-1 ${
                requestError ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {requestError || requestSuccess}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BandCard label="Task" value={evaluation.taskAchievement} />
        <BandCard label="C&C" value={evaluation.coherenceCohesion} />
        <BandCard label="Lexical" value={evaluation.lexicalResource} />
        <BandCard label="Grammar" value={evaluation.grammaticalRange} />
      </div>

      <div className="space-y-3">
        <details className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
            Overall feedback
          </summary>
          <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
            {sections["Overall feedback"] || evaluation.feedback}
          </div>
        </details>
        <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
            Task Achievement / Task Response
          </summary>
          <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
            {sections["Task Achievement / Task Response"] || ""}
          </div>
        </details>
        <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
            Coherence and Cohesion
          </summary>
          <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
            {sections["Coherence and Cohesion"] || ""}
          </div>
        </details>
        <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
            Lexical Resource
          </summary>
          <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
            {sections["Lexical Resource"] || ""}
          </div>
        </details>
        <details className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
          <summary className="cursor-pointer text-sm font-extrabold text-slate-900">
            Grammatical Range and Accuracy
          </summary>
          <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
            {sections["Grammatical Range and Accuracy"] || ""}
          </div>
        </details>
      </div>

      {evaluation.suggestions?.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Improvement suggestions
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">
            {evaluation.suggestions.map((s, idx) => (
              <li key={`${idx}-${s}`}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BandCard({ label, value }: { label: string; value: number }) {
  const c = bandColor(value);
  return (
    <div className={`rounded-4xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-widest ${c.label}`}>
            {label}
          </p>
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

function parseFeedbackSections(feedback: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!feedback) return out;

  const lines = feedback.split("\n");
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (!current) return;
    const text = buf.join("\n").trim();
    out[current] = text;
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const isHeading = trimmed.length > 1 && trimmed.endsWith(":") && !trimmed.startsWith("- ");

    if (isHeading) {
      flush();
      current = trimmed.slice(0, -1);
      buf = [];
      continue;
    }
    if (current) buf.push(line);
  }

  flush();
  return out;
}

