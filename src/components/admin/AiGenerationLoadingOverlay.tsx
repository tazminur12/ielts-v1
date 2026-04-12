"use client";

import { useEffect } from "react";
import { BrainCircuit, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  /** e.g. "Practice test" | "Mock exam" */
  label: string;
  /** Accent: practice = emerald, mock = blue */
  variant: "practice" | "mock";
};

const accentStyles = {
  practice: {
    ring: "border-emerald-400/30",
    glow: "bg-emerald-500/20",
    text: "text-emerald-700",
    bar: "from-emerald-500 to-teal-600",
    dot: "bg-emerald-500",
  },
  mock: {
    ring: "border-blue-400/30",
    glow: "bg-blue-500/20",
    text: "text-blue-800",
    bar: "from-blue-500 to-indigo-600",
    dot: "bg-blue-500",
  },
};

export function AiGenerationLoadingOverlay({ open, label, variant }: Props) {
  const a = accentStyles[variant];

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-6"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={`Generating ${label}`}
    >
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-md" />

      <div className="relative w-full max-w-md">
        <div
          className={`absolute -inset-1 rounded-3xl bg-linear-to-br ${a.bar} opacity-20 blur-xl`}
        />
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl shadow-black/20">
          <div className={`h-1 w-full bg-linear-to-r ${a.bar} animate-pulse`} />

          <div className="px-8 py-10 text-center">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full border-2 ${a.ring} animate-[spin_3s_linear_infinite]`}
              />
              <div
                className={`absolute inset-2 rounded-full border-2 border-dashed ${a.ring} animate-[spin_2s_linear_infinite_reverse]`}
              />
              <div
                className={`absolute inset-0 rounded-full ${a.glow} animate-pulse`}
              />
              <BrainCircuit className={`relative h-9 w-9 ${a.text}`} strokeWidth={1.5} />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Sparkles className={`h-5 w-5 ${a.text}`} />
              <h2 className={`text-lg font-bold tracking-tight ${a.text}`}>
                Generating {label}
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Building sections and questions — please keep this tab open.
            </p>

            <div className="mt-6 flex justify-center gap-1.5">
              {(
                [
                  "delay-0",
                  "delay-100",
                  "delay-200",
                  "delay-300",
                  "delay-[400ms]",
                ] as const
              ).map((delayClass, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${a.dot} animate-bounce [animation-duration:0.9s] ${delayClass}`}
                />
              ))}
            </div>

            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full w-3/5 max-w-full rounded-full bg-linear-to-r ${a.bar} animate-pulse`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
