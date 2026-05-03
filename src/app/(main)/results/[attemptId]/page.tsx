"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  XCircle,
} from "lucide-react";

type Attempt = {
  _id: string;
  status: string;
  module: string;
  examType: string;
  type?: string;
  rawScore?: number;
  totalMarks?: number;
  bandScore?: number;
  overallBand?: number;
  sectionBands?: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  startedAt: string;
  submittedAt?: string;
  testId?: {
    title?: string;
    module?: string;
    examType?: string;
    type?: string;
  };
};

type Question = {
  _id: string;
  questionText: string;
  questionType: string;
  correctAnswer?: string | string[];
  sectionId?: string;
  skill?: "listening" | "reading" | "writing" | "speaking";
};

type Section = {
  _id: string;
  order: number;
  sectionType: string;
  title: string;
  instructions?: string;
};

type Answer = {
  _id: string;
  questionId: Question | string;
  questionNumber: number;
  questionType: string;
  selectedOption?: string;
  textAnswer?: string;
  matchedAnswer?: string;
  booleanAnswer?: string;
  isCorrect?: boolean;
  correctAnswer?: string | string[];
  audioUrl?: string;
  transcribedText?: string;
  aiEvaluation?: {
    bandScore?: number;
    fluencyScore?: number;
    pronunciationScore?: number;
    grammarScore?: number;
    vocabularyScore?: number;
    coherenceScore?: number;
    taskAchievementScore?: number;
    feedback?: string;
    suggestions?: string[];
  };
  writingEvaluation?: {
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overallBand: number;
    feedback: string;
    suggestions: string[];
    evaluatedAt: string;
    evaluatedBy: "ai" | "manual";
    examinerNotes?: string;
  };
};

type ResultPayload = {
  attempt: Attempt;
  answers: Answer[];
  questions: Question[];
  sections: Section[];
};

function clampBand(b: unknown): number | null {
  const n = typeof b === "number" && Number.isFinite(b) ? b : null;
  if (n == null) return null;
  return Math.max(0, Math.min(9, n));
}

function overallTone(band: number) {
  if (band >= 7) return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (band >= 5) return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-rose-50 border-rose-200 text-rose-800";
}

function studentAnswer(a: Answer) {
  return a.selectedOption ?? a.booleanAnswer ?? a.matchedAnswer ?? a.textAnswer ?? "—";
}

function parseFeedbackSections(feedback: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!feedback) return out;
  const lines = feedback.split("\n");
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (!current) return;
    out[current] = buf.join("\n").trim();
  };
  for (const line of lines) {
    const t = line.trimEnd();
    const isHeading = t.length > 1 && t.endsWith(":") && !t.startsWith("- ");
    if (isHeading) {
      flush();
      current = t.slice(0, -1);
      buf = [];
      continue;
    }
    if (current) buf.push(line);
  }
  flush();
  return out;
}

function isSkillKey(v: unknown): v is "listening" | "reading" | "writing" | "speaking" {
  return v === "listening" || v === "reading" || v === "writing" || v === "speaking";
}

export default function AttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params?.attemptId;

  const [data, setData] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollRef = useRef<{ id: number | null; ticks: number }>({ id: null, ticks: 0 });

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;

    const stop = () => {
      if (pollRef.current.id != null) {
        window.clearInterval(pollRef.current.id);
        pollRef.current.id = null;
      }
    };

    const fetchOnce = async () => {
      await fetch(`/api/attempts/${attemptId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});

      const res = await fetch(`/api/results/${attemptId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || "Failed to load results");
      return payload as ResultPayload;
    };

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        pollRef.current.ticks = 0;
        stop();

        const first = await fetchOnce();
        if (cancelled) return;
        setData(first);
        setLoading(false);

        const overallBand = first?.attempt?.overallBand ?? first?.attempt?.bandScore;
        const pending = first?.attempt?.status === "submitted" && (overallBand == null || Number.isNaN(Number(overallBand)));
        if (!pending) return;

        pollRef.current.id = window.setInterval(async () => {
          try {
            pollRef.current.ticks += 1;
            const next = await fetchOnce();
            if (cancelled) return;
            setData(next);

            const ob = next?.attempt?.overallBand ?? next?.attempt?.bandScore;
            const stillPending =
              next?.attempt?.status === "submitted" && (ob == null || Number.isNaN(Number(ob)));

            if (!stillPending) {
              stop();
              return;
            }

            if (pollRef.current.ticks >= 36) {
              stop();
              setError("AI grading is taking longer than usual. Please refresh in a moment.");
            }
          } catch {
            pollRef.current.ticks += 1;
            if (pollRef.current.ticks >= 36) {
              stop();
              setError("AI grading is taking longer than usual. Please refresh in a moment.");
            }
          }
        }, 5000);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load results");
        setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      stop();
    };
  }, [attemptId]);

  const computed = useMemo(() => {
    if (!data) return null;
    const sectionById = new Map<string, Section>(data.sections.map((s) => [String(s._id), s]));

    const answers = (data.answers || []).slice().sort((a, b) => a.questionNumber - b.questionNumber);
    const bySkill: Record<"listening" | "reading" | "writing" | "speaking", Answer[]> = {
      listening: [],
      reading: [],
      writing: [],
      speaking: [],
    };

    for (const a of answers) {
      const q = a.questionId as any;
      const section = q?.sectionId ? sectionById.get(String(q.sectionId)) : undefined;
      const sectionType = section?.sectionType;
      const skill: any =
        q?.skill ||
        (a.questionType === "speaking" ? "speaking" : a.questionType === "essay" ? "writing" : undefined) ||
        (sectionType?.startsWith("listening") ? "listening" : undefined) ||
        (sectionType?.startsWith("reading") ? "reading" : undefined) ||
        (sectionType === "writing_task" ? "writing" : undefined) ||
        (sectionType === "speaking_part" ? "speaking" : undefined);

      if (isSkillKey(skill)) bySkill[skill].push(a);
    }

    const overallBand = clampBand(data.attempt.overallBand ?? data.attempt.bandScore);
    const sectionBands = data.attempt.sectionBands || {};

    const sectionBarData = [
      { name: "Listening", band: sectionBands.listening },
      { name: "Reading", band: sectionBands.reading },
      { name: "Writing", band: sectionBands.writing },
      { name: "Speaking", band: sectionBands.speaking },
    ].filter((x) => typeof x.band === "number");

    return { bySkill, overallBand, sectionBarData };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading results…</p>
        </div>
      </div>
    );
  }

  if (!data || !computed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full rounded-4xl border border-rose-200 bg-white shadow-sm p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5" />
            <div>
              <p className="text-sm font-extrabold text-slate-900">Result not available</p>
              <p className="text-sm font-medium text-slate-600 mt-1">{error || "Please try again."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overallBand = computed.overallBand;
  const isPending = data.attempt.status === "submitted" && !overallBand;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Result</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {data.attempt.testId?.title || "Test result"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {new Date(data.attempt.submittedAt || data.attempt.startedAt).toLocaleString("en-GB")}
              </p>
            </div>

            {isPending ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                <p className="text-sm font-extrabold text-amber-800">AI grading in progress</p>
              </div>
            ) : overallBand != null ? (
              <div className={`rounded-3xl border px-5 py-4 ${overallTone(overallBand)}`}>
                <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">Overall band</p>
                <p className="text-4xl font-extrabold tabular-nums mt-1">{overallBand}</p>
              </div>
            ) : null}
          </div>
        </div>

        {computed.sectionBarData.length > 0 && (
          <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-2">
              <BarChart3Icon />
              <h2 className="text-lg font-extrabold text-slate-900">Section-wise bands</h2>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computed.sectionBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 9]} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip />
                  <Bar dataKey="band" fill="#1a3a5c" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <ObjectiveSection
          icon={<Headphones className="w-5 h-5 text-blue-700" />}
          title="Listening"
          answers={computed.bySkill.listening}
        />
        <ObjectiveSection
          icon={<BookOpen className="w-5 h-5 text-emerald-700" />}
          title="Reading"
          answers={computed.bySkill.reading}
        />

        <WritingSection answers={computed.bySkill.writing} />
        <SpeakingSection answers={computed.bySkill.speaking} />
      </div>
    </div>
  );
}

function BarChart3Icon() {
  return (
    <div className="h-9 w-9 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
      <div className="flex items-end gap-0.5">
        <span className="w-1.5 h-3 bg-slate-400 rounded-sm" />
        <span className="w-1.5 h-5 bg-slate-500 rounded-sm" />
        <span className="w-1.5 h-4 bg-slate-400 rounded-sm" />
      </div>
    </div>
  );
}

function ObjectiveSection(props: { icon: React.ReactNode; title: string; answers: Answer[] }) {
  const { icon, title, answers } = props;
  if (!answers || answers.length === 0) return null;

  const graded = answers.filter((a) => typeof a.isCorrect === "boolean");
  const correct = graded.filter((a) => a.isCorrect).length;
  const total = graded.length;

  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600 font-medium">
              Score: <span className="font-extrabold text-slate-900">{correct}</span> / {total || answers.length}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {answers
          .slice()
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .map((a) => {
            const wrong = a.isCorrect === false;
            const correctAnswer = a.correctAnswer;
            return (
              <div key={a._id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Question {a.questionNumber}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 whitespace-pre-wrap">
                      {(a.questionId as any)?.questionText || ""}
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                      <span className={`font-extrabold ${wrong ? "text-rose-700" : "text-emerald-700"}`}>
                        Your answer: {String(studentAnswer(a))}
                      </span>
                      {correctAnswer !== undefined && (
                        <span className="text-slate-700 font-semibold">
                          Correct:{" "}
                          <span className="font-extrabold text-slate-900">
                            {Array.isArray(correctAnswer) ? correctAnswer.join(", ") : correctAnswer}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 mt-1">
                    {wrong ? (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    ) : a.isCorrect === true ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function WritingSection({ answers }: { answers: Answer[] }) {
  const items = answers.filter((a) => a.questionType === "essay");
  if (items.length === 0) return null;

  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="h-10 w-10 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          <PenLine className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Writing</h2>
          <p className="text-sm text-slate-600 font-medium">Essays and AI evaluation</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {items
          .slice()
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .map((a) => {
            const ev = a.writingEvaluation;
            const fallback = a.aiEvaluation;
            const criteria = ev
              ? {
                  task: ev.taskAchievement,
                  coherence: ev.coherenceCohesion,
                  lexical: ev.lexicalResource,
                  grammar: ev.grammaticalRange,
                  overall: ev.overallBand,
                  feedback: ev.feedback,
                  suggestions: ev.suggestions,
                }
              : fallback
              ? {
                  task: fallback.taskAchievementScore ?? 0,
                  coherence: fallback.coherenceScore ?? 0,
                  lexical: fallback.vocabularyScore ?? 0,
                  grammar: fallback.grammarScore ?? 0,
                  overall: fallback.bandScore ?? 0,
                  feedback: fallback.feedback || "",
                  suggestions: fallback.suggestions || [],
                }
              : null;

            const radarData = criteria
              ? [
                  { key: "Task", value: criteria.task },
                  { key: "Coherence", value: criteria.coherence },
                  { key: "Lexical", value: criteria.lexical },
                  { key: "Grammar", value: criteria.grammar },
                ]
              : [];

            const sections = criteria ? parseFeedbackSections(criteria.feedback) : {};

            return (
              <div key={a._id} className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                    Writing question {a.questionNumber}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                    {(a.questionId as any)?.questionText || ""}
                  </p>
                </div>

                {criteria && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Criteria chart</p>
                      <div className="mt-3 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="key" />
                            <PolarRadiusAxis domain={[0, 9]} />
                            <Radar dataKey="value" stroke="#b45309" fill="#f59e0b" fillOpacity={0.25} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-slate-900">
                        Overall band: <span className="tabular-nums">{criteria.overall}</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3">
                      <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <summary className="cursor-pointer text-sm font-extrabold text-slate-900">Feedback</summary>
                        <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                          {sections["Overall feedback"] || criteria.feedback}
                        </div>
                      </details>
                      {criteria.suggestions?.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Suggestions</p>
                          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-700 font-medium">
                            {criteria.suggestions.map((s, idx) => (
                              <li key={`${idx}-${s}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Your essay</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800 font-medium">
                    {a.textAnswer || ""}
                  </pre>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function SpeakingSection({ answers }: { answers: Answer[] }) {
  const items = answers.filter((a) => a.questionType === "speaking");
  if (items.length === 0) return null;

  const trend = items
    .filter((a) => typeof a.aiEvaluation?.bandScore === "number")
    .map((a) => ({
      name: `Q${a.questionNumber}`,
      band: a.aiEvaluation?.bandScore,
    }));

  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="h-10 w-10 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          <Mic className="w-5 h-5 text-rose-700" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Speaking</h2>
          <p className="text-sm text-slate-600 font-medium">Recording, transcript, and AI evaluation</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {trend.length > 1 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Band trend</p>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="band" stroke="#be123c" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {items
            .slice()
            .sort((a, b) => a.questionNumber - b.questionNumber)
            .map((a) => {
              const ev = a.aiEvaluation;
              return (
                <div key={a._id} className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Speaking question {a.questionNumber}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                      {(a.questionId as any)?.questionText || (a.questionId as any)?.speakingPrompt || ""}
                    </p>
                  </div>

                  {a.audioUrl && (
                    <audio controls className="w-full">
                      <source src={a.audioUrl} />
                    </audio>
                  )}

                  {a.transcribedText && (
                    <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-extrabold text-slate-900">Transcript</summary>
                      <div className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">{a.transcribedText}</div>
                    </details>
                  )}

                  {ev && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Criteria</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
                          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                            <span>Fluency</span>
                            <span className="font-extrabold tabular-nums">{ev.fluencyScore ?? ev.coherenceScore ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                            <span>Lexical</span>
                            <span className="font-extrabold tabular-nums">{ev.vocabularyScore ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                            <span>Grammar</span>
                            <span className="font-extrabold tabular-nums">{ev.grammarScore ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                            <span>Pronunciation</span>
                            <span className="font-extrabold tabular-nums">{ev.pronunciationScore ?? "—"}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm font-extrabold text-slate-900">
                          Overall band: <span className="tabular-nums">{ev.bandScore ?? "—"}</span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Feedback</p>
                        <p className="mt-2 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                          {ev.feedback || ""}
                        </p>
                        {ev.suggestions && ev.suggestions.length > 0 && (
                          <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-slate-700 font-medium">
                            {ev.suggestions.map((s, idx) => (
                              <li key={`${idx}-${s}`}>{s}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
