"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, BookOpen, Headphones,
  PenLine, Mic, Loader2, AlertCircle, RotateCcw,
  Home, Clock, Target, TrendingUp, ChevronDown, ChevronUp,
  Sparkles, FileText, Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIEvaluation {
  bandScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  coherenceScore?: number;
  taskAchievementScore?: number;
  feedback?: string;
  suggestions?: string[];
}

interface Answer {
  _id: string;
  questionNumber: number;
  questionType: string;
  selectedOption?: string;
  textAnswer?: string;
  matchedAnswer?: string;
  booleanAnswer?: string;
  isCorrect?: boolean;
  marksAwarded?: number;
  correctAnswer?: string | string[];
  aiEvaluation?: AIEvaluation;
  transcribedText?: string;
}

interface SectionBands {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}

interface Attempt {
  _id: string;
  status: string;
  examType: string;
  module: string;
  rawScore?: number;
  totalMarks?: number;
  percentageScore?: number;
  bandScore?: number;
  overallBand?: number;
  sectionBands?: SectionBands;
  timeSpent?: number;
  startedAt: string;
  submittedAt?: string;
  testId: { title: string; module: string; examType: string; totalQuestions?: number };
}

// ─── Band Helpers ─────────────────────────────────────────────────────────────

const BAND_DESCRIPTORS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  9: { label: "Expert User",              color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-300" },
  8: { label: "Very Good User",           color: "text-teal-700",   bg: "bg-teal-50",     border: "border-teal-300"   },
  7: { label: "Good User",               color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-300"   },
  6: { label: "Competent User",          color: "text-indigo-700", bg: "bg-indigo-50",   border: "border-indigo-300" },
  5: { label: "Modest User",             color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-300"  },
  4: { label: "Limited User",            color: "text-orange-700", bg: "bg-orange-50",   border: "border-orange-300" },
  3: { label: "Extremely Limited User",  color: "text-red-700",    bg: "bg-red-50",      border: "border-red-300"    },
  2: { label: "Intermittent User",       color: "text-red-700",    bg: "bg-red-50",      border: "border-red-300"    },
  1: { label: "Non User",                color: "text-red-800",    bg: "bg-red-100",     border: "border-red-400"    },
};

function getBandDescriptor(band: number) {
  const rounded = Math.round(band);
  return BAND_DESCRIPTORS[Math.min(9, Math.max(1, rounded))] ?? BAND_DESCRIPTORS[5];
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function studentAnswer(a: Answer) {
  return a.selectedOption ?? a.booleanAnswer ?? a.matchedAnswer ?? a.textAnswer ?? "—";
}

// ─── Band Scale Bar ───────────────────────────────────────────────────────────

function BandScaleBar({ band }: { band: number }) {
  const pct = ((band - 1) / 8) * 100;
  const descriptor = getBandDescriptor(band);
  return (
    <div className="w-full">
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        {/* Gradient track */}
        <div className="absolute inset-0 bg-linear-to-r from-red-400 via-amber-400 to-emerald-500 opacity-30 rounded-full" />
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full bg-linear-to-r from-red-400 via-amber-400 to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">1</span>
        <span className={`text-[10px] font-semibold ${descriptor.color}`}>{descriptor.label}</span>
        <span className="text-[10px] text-slate-400">9</span>
      </div>
    </div>
  );
}

// ─── Module Score Card ────────────────────────────────────────────────────────

function ModuleCard({ module, band }: { module: string; band: number }) {
  const descriptor = getBandDescriptor(band);
  const icons: Record<string, React.ReactNode> = {
    listening: <Headphones size={18} />,
    reading:   <BookOpen size={18} />,
    writing:   <PenLine size={18} />,
    speaking:  <Mic size={18} />,
  };
  return (
    <div className={`rounded-2xl border ${descriptor.border} ${descriptor.bg} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${descriptor.color}`}>
          {icons[module] ?? <FileText size={18} />}
          <span className="text-xs font-bold uppercase tracking-wider">{module}</span>
        </div>
        <span className={`text-3xl font-black ${descriptor.color}`}>{band}</span>
      </div>
      <BandScaleBar band={band} />
    </div>
  );
}

// ─── AI Rubric Score Bar ──────────────────────────────────────────────────────

function RubricBar({ label, score, max = 9 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600 font-medium">{label}</span>
        <span className="text-xs font-bold text-[#1a3a5c]">{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-[#1a3a5c] to-[#c8a84b] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Results Content ─────────────────────────────────────────────────────

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const attemptId = params.get("attemptId");

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null);
  const [expandedAI, setExpandedAI] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) { setError("No attempt ID provided."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        if (!res.ok) throw new Error("Failed to load results.");
        const data = await res.json();
        setAttempt(data.attempt);
        setAnswers(data.answers ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error loading results");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4f8] gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-[#1a3a5c] border-t-transparent animate-spin" />
        <p className="text-[#1a3a5c] font-semibold text-sm tracking-wide uppercase">Loading Results</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="font-bold text-slate-800 text-lg mb-2">Results Not Found</p>
          <p className="text-slate-500 text-sm mb-6">{error || "Could not load your test results."}</p>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-2.5 bg-[#1a3a5c] text-white rounded-xl font-semibold text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const overallBand = attempt.overallBand ?? attempt.bandScore;
  const isPending = attempt.status === "submitted" && !overallBand;
  const descriptor = overallBand ? getBandDescriptor(overallBand) : null;

  const objectiveAnswers = answers.filter(
    (a) => a.questionType !== "essay" && a.questionType !== "speaking"
  ).sort((a, b) => a.questionNumber - b.questionNumber);

  const aiAnswers = answers.filter((a) => a.aiEvaluation);

  const correctCount = objectiveAnswers.filter((a) => a.isCorrect).length;
  const totalObjective = objectiveAnswers.length;
  const accuracy = totalObjective > 0 ? Math.round((correctCount / totalObjective) * 100) : null;

  const sectionBands = attempt.sectionBands;
  const hasSectionBands = sectionBands && Object.values(sectionBands).some((v) => v !== undefined);

  const testDate = new Date(attempt.startedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-16">

      {/* ── Official Header ───────────────────────────────────────────── */}
      <div className="bg-[#111827] text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex gap-5 items-center">
              <div className="w-16 h-16 bg-linear-to-tr from-[#c8a84b] to-[#e6d086] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-yellow-900/20">
                <Target className="text-[#111827] w-8 h-8" />
              </div>
              <div>
                <p className="text-[#c8a84b] text-xs font-bold tracking-[0.25em] uppercase mb-1">Official Mock Test Report</p>
                <h1 className="text-white font-extrabold text-3xl leading-tight tracking-tight">{attempt.testId?.title ?? "IELTS Practice Test"}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-slate-200 capitalize font-medium">
                    {attempt.testId?.module ?? attempt.module}
                  </span>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-slate-200 capitalize font-medium">
                    {attempt.testId?.examType ?? attempt.examType}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    {testDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            {isPending ? (
              <div className="shrink-0 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold px-5 py-2.5 rounded-full shadow-inner">
                <Loader2 size={16} className="animate-spin" />
                Generating Analysis
              </div>
            ) : (
              <div className="shrink-0 flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold px-5 py-2.5 rounded-full shadow-inner">
                <CheckCircle size={16} />
                Fully Evaluated
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-8">

        {/* ── Pending Notice ───────────────────────────────────────────── */}
        {isPending && (
          <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 flex gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
               <Loader2 size={20} className="text-amber-600 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-base">Processing Results</p>
              <p className="text-amber-700 text-sm mt-1">If this includes Writing or Speaking, our AI examiner is reviewing your responses. This usually takes 1-2 minutes. Objective scores (Listening/Reading) are available immediately below.</p>
            </div>
          </div>
        )}

        {/* ── Overall Band Score Card ───────────────────────────────────── */}
        {overallBand ? (
          <div className="bg-[#1a3a5c] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-7 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-[#c8a84b] text-xs font-bold uppercase tracking-[0.2em] mb-1">Overall Band Score</p>
                <div className="flex items-baseline gap-3 justify-center sm:justify-start">
                  <span className="text-7xl font-black text-white leading-none">{overallBand}</span>
                  <span className="text-2xl font-light text-slate-400">/ 9</span>
                </div>
                {descriptor && (
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-semibold ${descriptor.bg} ${descriptor.color}`}>
                    <Target size={13} />
                    {descriptor.label}
                  </div>
                )}
              </div>

              {/* Circular score visualiser */}
              <div className="shrink-0 relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="#c8a84b" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - overallBand / 9)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white leading-none">{overallBand}</span>
                  <span className="text-[#c8a84b] text-[10px] font-bold uppercase tracking-wider mt-0.5">Band</span>
                </div>
              </div>
            </div>

            {/* Band scale strip */}
            <div className="bg-white/5 px-7 py-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider shrink-0">Scale</span>
                <div className="flex-1 flex gap-0.5">
                  {[1,2,3,4,5,6,7,8,9].map((n) => (
                    <div
                      key={n}
                      className={`flex-1 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold transition-colors ${
                        n <= overallBand
                          ? "bg-[#c8a84b] text-[#1a3a5c]"
                          : "bg-white/10 text-slate-500"
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
            <Loader2 size={32} className="text-slate-300 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Band score being calculated…</p>
          </div>
        )}

        {/* ── Module / Section Bands ────────────────────────────────────── */}
        {hasSectionBands && (
          <div>
            <SectionHeader icon={<TrendingUp size={16} />} title="Skills Breakdown" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {(Object.entries(sectionBands!) as [string, number | undefined][])
                .filter(([, v]) => v !== undefined)
                .map(([mod, band]) => (
                  <ModuleCard key={mod} module={mod} band={band!} />
                ))
              }
            </div>
          </div>
        )}

        {/* Single-module band (no section bands) */}
        {!hasSectionBands && attempt.bandScore && (
          <div>
            <SectionHeader icon={<TrendingUp size={16} />} title="Module Score" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <ModuleCard module={attempt.module} band={attempt.bandScore} />
            </div>
          </div>
        )}

        {/* ── Stats Row ────────────────────────────────────────────────── */}
        {(accuracy !== null || attempt.rawScore !== undefined || attempt.timeSpent) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {totalObjective > 0 && (
              <StatCard
                icon={<Target size={16} className="text-[#1a3a5c]" />}
                label="Accuracy"
                value={`${accuracy}%`}
                sub={`${correctCount} / ${totalObjective} correct`}
              />
            )}
            {attempt.rawScore !== undefined && (
              <StatCard
                icon={<Award size={16} className="text-[#c8a84b]" />}
                label="Raw Score"
                value={String(attempt.rawScore)}
                sub={attempt.totalMarks ? `out of ${attempt.totalMarks}` : undefined}
              />
            )}
            {attempt.percentageScore !== undefined && (
              <StatCard
                icon={<TrendingUp size={16} className="text-blue-500" />}
                label="Percentage"
                value={`${attempt.percentageScore}%`}
              />
            )}
            {attempt.timeSpent && (
              <StatCard
                icon={<Clock size={16} className="text-slate-400" />}
                label="Time Spent"
                value={formatTime(attempt.timeSpent)}
              />
            )}
          </div>
        )}

        {/* ── AI Feedback (Writing / Speaking) ─────────────────────────── */}
        {aiAnswers.length > 0 && (
          <div>
            <SectionHeader icon={<Sparkles size={16} />} title="AI Examiner Feedback" />
            <div className="mt-3 space-y-3">
              {aiAnswers.map((a) => {
                const ev = a.aiEvaluation!;
                const isOpen = expandedAI === a._id;
                const desc = ev.bandScore ? getBandDescriptor(ev.bandScore) : null;
                return (
                  <div key={a._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedAI(isOpen ? null : a._id)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1a3a5c]/8 flex items-center justify-center">
                          {a.questionType === "speaking" ? <Mic size={15} className="text-[#1a3a5c]" /> : <PenLine size={15} className="text-[#1a3a5c]" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">
                            {a.questionType === "speaking" ? "Speaking" : "Writing"} — Question {a.questionNumber}
                          </p>
                          {ev.feedback && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{ev.feedback}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {ev.bandScore && desc && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${desc.bg} ${desc.color} ${desc.border}`}>
                            <Award size={11} />
                            Band {ev.bandScore}
                          </div>
                        )}
                        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50/50">
                        {/* Feedback text */}
                        {ev.feedback && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Examiner Feedback</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{ev.feedback}</p>
                          </div>
                        )}

                        {/* Rubric scores */}
                        {(ev.taskAchievementScore || ev.coherenceScore || ev.vocabularyScore || ev.grammarScore) && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assessment Criteria</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {ev.taskAchievementScore !== undefined && (
                                <RubricBar label="Task Achievement" score={ev.taskAchievementScore} />
                              )}
                              {ev.coherenceScore !== undefined && (
                                <RubricBar label="Coherence & Cohesion" score={ev.coherenceScore} />
                              )}
                              {ev.vocabularyScore !== undefined && (
                                <RubricBar label="Lexical Resource" score={ev.vocabularyScore} />
                              )}
                              {ev.grammarScore !== undefined && (
                                <RubricBar label="Grammatical Range" score={ev.grammarScore} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {ev.suggestions && ev.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Improvement Suggestions</p>
                            <ul className="space-y-2">
                              {ev.suggestions.map((s, i) => (
                                <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#1a3a5c]/10 text-[#1a3a5c] flex items-center justify-center text-[10px] font-bold mt-0.5">
                                    {i + 1}
                                  </span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Transcription */}
                        {a.transcribedText && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transcription</p>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600 leading-relaxed italic">
                              {a.transcribedText}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Answer Review ─────────────────────────────────────────────── */}
        {objectiveAnswers.length > 0 && (
          <div>
            <SectionHeader icon={<CheckCircle size={16} />} title="Answer Review" sub={`${correctCount} correct out of ${totalObjective}`} />

            {/* Quick grid */}
            <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-10 gap-px bg-slate-100 p-px rounded-2xl">
                {objectiveAnswers.map((a) => (
                  <button
                    key={a._id}
                    onClick={() => setExpandedAnswer(expandedAnswer === a._id ? null : a._id)}
                    title={`Q${a.questionNumber}: ${a.isCorrect ? "Correct" : "Incorrect"}`}
                    className={`aspect-square flex items-center justify-center text-xs font-bold rounded-sm transition-opacity hover:opacity-80 ${
                      a.isCorrect === undefined
                        ? "bg-slate-100 text-slate-400"
                        : a.isCorrect
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {a.questionNumber}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
                  Correct
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
                  Incorrect
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
                  Not graded
                </div>
              </div>
            </div>

            {/* Detailed list */}
            <div className="mt-3 space-y-1.5">
              {objectiveAnswers
                .filter((a) => a.isCorrect === false)
                .map((a) => {
                  const isOpen = expandedAnswer === a._id;
                  return (
                    <div key={a._id} className="bg-white rounded-xl border border-red-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedAnswer(isOpen ? null : a._id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50/50 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {a.questionNumber}
                        </span>
                        <XCircle size={14} className="text-red-400 shrink-0" />
                        <span className="text-sm text-slate-600 flex-1">
                          Your answer: <strong className="text-red-600">{studentAnswer(a)}</strong>
                        </span>
                        {isOpen ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-red-50 bg-red-50/30 space-y-1.5 text-sm">
                          {a.correctAnswer && (
                            <p className="text-emerald-700 font-medium">
                              ✓ Correct answer:{" "}
                              <strong>{Array.isArray(a.correctAnswer) ? a.correctAnswer.join(", ") : a.correctAnswer}</strong>
                            </p>
                          )}
                          <p className="text-slate-400 text-xs capitalize">
                            Type: {a.questionType?.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard/mock-tests"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1a3a5c] text-white rounded-2xl font-bold text-sm hover:bg-[#0f2540] transition-colors shadow-sm"
          >
            <RotateCcw size={15} /> Take Another Test
          </Link>
          <Link
            href="/dashboard/progress"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#c8a84b] text-[#1a3a5c] rounded-2xl font-bold text-sm hover:bg-[#b8943b] transition-colors shadow-sm"
          >
            <TrendingUp size={15} /> View My Progress
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-slate-200 text-slate-700 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="text-[#1a3a5c]">{icon}</div>
        <h3 className="font-bold text-slate-800 text-base">{title}</h3>
      </div>
      {sub && <span className="text-xs text-slate-400 font-medium">{sub}</span>}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
        <div className="w-12 h-12 rounded-full border-4 border-[#1a3a5c] border-t-transparent animate-spin" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
