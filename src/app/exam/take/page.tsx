"use client";

import { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, AlertCircle, CheckCircle, Mic, MicOff, Send,
  Loader2, ChevronLeft, ChevronRight, BookOpen,
  Headphones, PenLine, MessageSquare, FileText,
} from "lucide-react";
import { effectiveTestDurationMinutes } from "@/lib/testDuration";

// ─── Types (aligned with backend enums) ──────────────────────────────────────

type QuestionType =
  | "multiple_choice"
  | "true_false_not_given"
  | "fill_blank"
  | "matching"
  | "sentence_completion"
  | "short_answer"
  | "essay"
  | "speaking"
  | "matching_headings"
  | "summary_completion";

interface Option { label: string; text: string }

interface Question {
  _id: string;
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  options?: Option[];
  matchingOptions?: string[];
  speakingPrompt?: string;
  speakingDuration?: number;
  imageUrl?: string;
  wordLimit?: number;
  marks: number;
  order: number;
}

interface QuestionGroup {
  _id: string;
  questionType: QuestionType;
  title?: string;
  instructions?: string;
  questionNumberStart: number;
  questionNumberEnd: number;
  matchingOptions?: string[];
  questions: Question[];
}

interface Section {
  _id: string;
  title: string;
  order: number;
  sectionType: "listening_part" | "reading_passage" | "writing_task" | "speaking_part";
  instructions?: string;
  audioUrl?: string;
  passageText?: string;
  passageImage?: string;
  timeLimit?: number;
  groups: QuestionGroup[];
}

interface TestData {
  _id: string;
  title: string;
  module: string;
  examType: string;
  duration: number;
  instructions?: string;
  sections: Section[];
}

type AnswerMap = Record<string, string>;

// ─── API raw response types ───────────────────────────────────────────────────

interface RawTest {
  _id: string;
  title: string;
  module: string;
  examType: string;
  duration: number;
  instructions?: string;
}

interface RawSection {
  _id: string;
  title: string;
  order: number;
  sectionType: "listening_part" | "reading_passage" | "writing_task" | "speaking_part";
  instructions?: string;
  audioUrl?: string;
  passageText?: string;
  passageImage?: string;
  timeLimit?: number;
}

interface RawGroup {
  _id: string;
  sectionId: string;
  questionType: QuestionType;
  title?: string;
  instructions?: string;
  order: number;
  questionNumberStart: number;
  questionNumberEnd: number;
  matchingOptions?: string[];
}

interface RawQuestion {
  _id: string;
  groupId: string;
  sectionId: string;
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  options?: Option[];
  speakingPrompt?: string;
  speakingDuration?: number;
  imageUrl?: string;
  marks: number;
  order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildNestedTest(
  raw: RawTest,
  sections: RawSection[],
  groups: RawGroup[],
  questions: RawQuestion[]
): TestData {
  const nestedSections: Section[] = sections.map((sec) => {
    const secGroups = groups
      .filter((g) => String(g.sectionId) === String(sec._id))
      .sort((a, b) => a.order - b.order)
      .map((grp) => {
        const grpQuestions = questions
          .filter((q) => String(q.groupId) === String(grp._id))
          .sort((a, b) => a.order - b.order);
        return { ...grp, questions: grpQuestions } as QuestionGroup;
      });
    return { ...sec, groups: secGroups } as Section;
  });

  return { ...raw, sections: nestedSections };
}

function sectionIcon(type: Section["sectionType"]) {
  switch (type) {
    case "listening_part": return <Headphones size={14} />;
    case "reading_passage": return <BookOpen size={14} />;
    case "writing_task": return <PenLine size={14} />;
    case "speaking_part": return <MessageSquare size={14} />;
    default: return <FileText size={14} />;
  }
}

function sectionLabel(type: Section["sectionType"]) {
  switch (type) {
    case "listening_part": return "Listening";
    case "reading_passage": return "Reading";
    case "writing_task": return "Writing";
    case "speaking_part": return "Speaking";
    default: return "Section";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function TakeExamContent() {
  const router = useRouter();
  const params = useSearchParams();
  const testId = params.get("testId");
  const mode = params.get("mode") ?? "mock";

  const [test, setTest] = useState<TestData | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [error, setError] = useState("");

  const [writingTexts, setWritingTexts] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<Record<string, boolean>>({});
  const [speakingDone, setSpeakingDone] = useState<Record<string, boolean>>({});
  const mediaRecorderRef = useRef<Record<string, MediaRecorder>>({});
  const audioChunksRef = useRef<Record<string, Blob[]>>({});
  const saveInFlight = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // timerActive: true only after test loads with a non-zero duration
  const [timerActive, setTimerActive] = useState(false);
  // Ref keeps handleSubmit fresh so the auto-submit effect never uses stale closure
  const handleSubmitRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});

  const questionNumberById = useMemo(() => {
    const map = new Map<string, number>();
    if (!test) return map;
    for (const sec of test.sections ?? []) {
      for (const grp of sec.groups ?? []) {
        for (const q of grp.questions ?? []) {
          if (q?._id) map.set(String(q._id), Number(q.questionNumber));
        }
      }
    }
    return map;
  }, [test]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) { setError("No test ID provided."); setLoading(false); return; }

    (async () => {
      try {
        const [testRes, attemptRes] = await Promise.all([
          fetch(`/api/tests/${testId}`),
          fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ testId }),
          }),
        ]);

        if (!testRes.ok) throw new Error("Failed to load test.");
        if (!attemptRes.ok) {
          const err = await attemptRes.json();
          throw new Error(err.error || err.message || "Failed to start attempt.");
        }

        const { test: rawTest, sections, groups, questions } = await testRes.json();
        const attemptData = await attemptRes.json();

        const durationMins = effectiveTestDurationMinutes(rawTest);
        const nested = {
          ...buildNestedTest(rawTest, sections ?? [], groups ?? [], questions ?? []),
          duration: durationMins,
        };
        setTest(nested);
        setAttemptId(attemptData.attempt._id);

        if (attemptData.attempt.status === "in_progress") {
          const ansRes = await fetch(`/api/answers?attemptId=${attemptData.attempt._id}`);
          if (ansRes.ok) {
            const { answers: saved } = await ansRes.json();
            const map: AnswerMap = {};
            if (Array.isArray(saved)) {
              saved.forEach((a: Record<string, string>) => {
                map[a.questionId] = a.textAnswer ?? a.selectedOption ?? a.matchedAnswer ?? "";
              });
            }
            setAnswers(map);
          }
        }

        const totalSecs = durationMins > 0 ? durationMins * 60 : 0;
        if (totalSecs > 0) {
          // Deduct elapsed time if resuming an existing attempt
          let remaining = totalSecs;
          if (attemptData.resumed && attemptData.attempt.startedAt) {
            const elapsed = Math.floor(
              (Date.now() - new Date(attemptData.attempt.startedAt).getTime()) / 1000
            );
            remaining = Math.max(0, totalSecs - elapsed);
          }
          setTimeLeft(remaining);
          if (remaining > 0) setTimerActive(true);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  // ── Countdown — starts only once when timerActive becomes true ────────────
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [timerActive]);

  // ── Auto-submit when timer hits 0 (uses ref to avoid stale closure) ───────
  useEffect(() => {
    if (timerActive && timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleSubmitRef.current(true);
    }
  }, [timeLeft, timerActive]);

  // ── Save answer ────────────────────────────────────────────────────────────
  const saveAnswer = useCallback(async (questionId: string, value: string, questionType: string) => {
    if (!attemptId) return;
    const questionNumber = questionNumberById.get(String(questionId));
    if (questionNumber == null || !Number.isFinite(questionNumber)) return;
    if (saveInFlight.current.has(questionId)) return;
    saveInFlight.current.add(questionId);

    const body: Record<string, unknown> = { attemptId, questionId, questionNumber, questionType };
    const selectTypes: QuestionType[] = ["multiple_choice", "true_false_not_given", "matching", "matching_headings"];
    if (selectTypes.includes(questionType as QuestionType)) {
      body.selectedOption = value;
    } else {
      body.textAnswer = value;
    }

    try {
      await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      saveInFlight.current.delete(questionId);
    }
  }, [attemptId, questionNumberById]);

  const handleAnswer = (questionId: string, value: string, questionType: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value, questionType);
  };

  const handleWritingChange = (questionId: string, text: string) => {
    setWritingTexts((prev) => ({ ...prev, [questionId]: text }));
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleWritingBlur = (questionId: string) => {
    const text = writingTexts[questionId] ?? "";
    if (!attemptId) return;
    saveAnswer(questionId, text, "essay");
  };

  // ── Speaking ───────────────────────────────────────────────────────────────
  const startRecording = async (questionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current[questionId] = [];
      mr.ondataavailable = (e) => audioChunksRef.current[questionId].push(e.data);
      mr.onstop = () => uploadSpeaking(questionId, stream);
      mr.start();
      mediaRecorderRef.current[questionId] = mr;
      setRecording((prev) => ({ ...prev, [questionId]: true }));
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = (questionId: string) => {
    mediaRecorderRef.current[questionId]?.stop();
    setRecording((prev) => ({ ...prev, [questionId]: false }));
  };

  const uploadSpeaking = async (questionId: string, stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
    if (!attemptId) return;
    const blob = new Blob(audioChunksRef.current[questionId], { type: "audio/webm" });
    const fd = new FormData();
    fd.append("attemptId", attemptId);
    fd.append("questionId", questionId);
    fd.append("audio", blob, "speaking.webm");
    try {
      await fetch("/api/ai/speaking", { method: "POST", body: fd });
      setSpeakingDone((prev) => ({ ...prev, [questionId]: true }));
    } catch {
      alert("Failed to upload speaking audio. Please try again.");
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    setSubmitting(true);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const writingQs = allQuestions().filter((q) => q.questionType === "essay" && answers[q._id]);
    for (const q of writingQs) {
      try {
        await fetch("/api/ai/writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, questionId: q._id }),
        });
      } catch { /* non-fatal */ }
    }

    try {
      const res = await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) throw new Error("Submission failed");
      router.push(`/exam/results?attemptId=${attemptId}`);
    } catch {
      setSubmitting(false);
      if (!autoSubmit) alert("Failed to submit. Please try again.");
    }
  };

  // Keep the ref in sync so auto-submit effect always calls the latest version
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  const confirmAndSubmit = () => {
    const unanswered = allQuestions().filter((q) => !answers[q._id]).length;
    if (unanswered > 0) {
      setSubmitConfirm(true);
    } else {
      handleSubmit();
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const allQuestions = (): Question[] => {
    if (!test) return [];
    return test.sections.flatMap((s) => s.groups.flatMap((g) => g.questions));
  };

  const answeredCount = allQuestions().filter((q) => answers[q._id]).length;
  const totalQuestions = allQuestions().length;
  const activeSection = test?.sections[activeSectionIdx];
  const isCriticalTime = timerActive && timeLeft > 0 && timeLeft <= 60;   // last 1 min
  const isLowTime = timerActive && timeLeft > 60 && timeLeft < 300;       // last 5 min

  // ── Loading & Error States ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#e8e4dc]">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-full border-[3px] border-[#0c1a2e] border-t-transparent animate-spin mx-auto mb-5" />
          <p className="text-[#0c1a2e] font-semibold text-xs tracking-[0.2em] uppercase">
            Preparing your test
          </p>
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Secure session loading. Please do not refresh this page.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#e8e4dc] px-4">
        <div className="bg-[#faf9f6] rounded-sm border border-[#d4cfc4] shadow-[0_4px_24px_rgba(12,26,46,0.08)] p-8 max-w-md w-full text-center">
          <AlertCircle size={36} className="text-red-600 mx-auto mb-3" />
          <p className="text-[#0c1a2e] font-bold text-lg mb-2">Session could not start</p>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-8 py-3 bg-[#0c1a2e] text-white text-sm font-semibold hover:bg-[#050d16] transition-colors border border-[#0c1a2e]"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="flex flex-col min-h-dvh h-dvh max-h-dvh bg-[#e8e4dc] overflow-hidden font-sans text-slate-900">

      {/* Official-style candidate notice */}
      <div className="bg-[#050d16] text-slate-400 text-[10px] sm:text-[11px] px-3 sm:px-5 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 shrink-0 border-b border-white/6">
        <span className="font-semibold tracking-[0.12em] uppercase text-slate-500 text-center sm:text-left">
          Computer-delivered test
        </span>
        <span className="text-center sm:text-right text-slate-500 hidden md:block">
          Do not refresh. Answers save automatically.
        </span>
      </div>

      {/* ── Main chrome ───────────────────────────────────────────────────── */}
      <header className="bg-[#0c1a2e] text-white px-3 sm:px-5 py-0 flex items-stretch justify-between shrink-0 shadow-[0_2px_12px_rgba(0,0,0,0.2)] z-20 border-b border-[#c9a227]/25">
        <div className="flex items-center gap-2.5 sm:gap-3 py-2.5 sm:py-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#c9a227] shrink-0 flex items-center justify-center border border-[#e4c96a]/30">
            <span className="text-[#0c1a2e] font-black text-[10px] sm:text-xs tracking-tight">CD</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs sm:text-sm leading-tight truncate">
              IELTS preparation
            </p>
            <p className="text-[#c9a227] text-[9px] sm:text-[10px] font-semibold tracking-[0.15em] uppercase truncate">
              {test.module} · {test.examType}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center px-4 max-w-md lg:max-w-lg min-w-0">
          <p className="text-slate-400 text-xs font-medium truncate text-center w-full border-x border-white/10 px-3">
            {test.title}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end pr-1 border-r border-white/10 mr-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Progress</span>
            <span className="text-white font-semibold text-sm tabular-nums">
              {answeredCount} / {totalQuestions}
            </span>
          </div>

          {test.duration > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-mono text-sm sm:text-base font-bold tabular-nums transition-colors border ${
                isCriticalTime
                  ? "bg-red-950/50 text-red-200 border-red-500/40 animate-pulse"
                  : isLowTime
                    ? "bg-amber-950/40 text-amber-200 border-amber-500/30"
                    : "bg-[#0c1a2e] text-[#c9a227] border-[#c9a227]/35"
              }`}
            >
              <Clock size={14} className="shrink-0 opacity-90" />
              {formatTime(timeLeft)}
              {isCriticalTime && (
                <span className="text-[9px] font-bold tracking-widest ml-0.5">!</span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={confirmAndSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#c9a227] hover:bg-[#b89220] disabled:opacity-60 text-[#0c1a2e] font-bold text-xs sm:text-sm px-3 sm:px-5 py-2 transition-colors border border-[#dfc45a]/40 shadow-sm"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit
          </button>
        </div>
      </header>

      {/* ── Section parts (test booklet style) ─────────────────────────── */}
      <div className="bg-[#081220] flex items-stretch gap-0 shrink-0 overflow-x-auto">
        {test.sections.map((sec, idx) => {
          const secTotal = sec.groups.flatMap((g) => g.questions).length;
          const secAnswered = sec.groups.flatMap((g) => g.questions).filter((q) => answers[q._id]).length;
          const active = idx === activeSectionIdx;
          return (
            <button
              key={sec._id}
              type="button"
              onClick={() => setActiveSectionIdx(idx)}
              aria-label={`${sectionLabel(sec.sectionType)}: ${sec.title || `Part ${sec.order}`}`}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 min-h-[44px] ${
                active
                  ? "text-[#c9a227] border-[#c9a227] bg-[#0c1a2e]"
                  : "text-slate-500 border-transparent hover:text-slate-200 hover:bg-[#0c1a2e]/60"
              }`}
            >
              {sectionIcon(sec.sectionType)}
              <span className="uppercase tracking-[0.08em] max-w-[140px] sm:max-w-none truncate">
                {sec.title || `Part ${sec.order}`}
              </span>
              <span
                className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 border ${
                  active
                    ? "border-[#c9a227]/40 text-[#c9a227] bg-[#c9a227]/10"
                    : "border-white/10 text-slate-500 bg-black/20"
                }`}
              >
                {secAnswered}/{secTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {activeSection && (
          <SectionView
            section={activeSection}
            answers={answers}
            writingTexts={writingTexts}
            recording={recording}
            speakingDone={speakingDone}
            onAnswer={handleAnswer}
            onWritingChange={handleWritingChange}
            onWritingBlur={handleWritingBlur}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            mode={mode}
          />
        )}
      </main>

      {/* ── Section navigation (footer) ─────────────────────────────────── */}
      <footer className="bg-[#faf9f6] border-t-2 border-[#0c1a2e]/10 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0 shadow-[0_-4px_20px_rgba(12,26,46,0.06)]">
        <button
          type="button"
          onClick={() => setActiveSectionIdx((i) => Math.max(0, i - 1))}
          disabled={activeSectionIdx === 0}
          className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0c1a2e] disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Previous part</span>
        </button>

        <div className="flex items-center gap-1.5">
          {test.sections.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSectionIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeSectionIdx
                  ? "w-8 bg-[#c9a227]"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Part ${i + 1}`}
              aria-current={i === activeSectionIdx ? "step" : undefined}
            />
          ))}
        </div>

        {activeSectionIdx === test.sections.length - 1 ? (
          <button
            type="button"
            onClick={() => setSubmitConfirm(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0c1a2e] bg-[#c9a227] px-3 sm:px-4 py-2 hover:bg-[#b89220] transition-colors border border-[#dfc45a]/50"
          >
            End test <Send size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              setActiveSectionIdx((i) =>
                Math.min(test.sections.length - 1, i + 1)
              )
            }
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0c1a2e] hover:opacity-80 transition-opacity"
          >
            <span className="hidden sm:inline">Next part</span> <ChevronRight size={18} />
          </button>
        )}
      </footer>

      {/* ── End test confirmation ───────────────────────────────────────── */}
      {submitConfirm && (
        <div
          className="fixed inset-0 bg-[#0c1a2e]/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
        >
          <div className="bg-[#faf9f6] max-w-md w-full border border-[#d4cfc4] shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
            <div className="h-1 bg-[#c9a227]" />
            <div className="p-6 sm:p-8">
              <AlertCircle size={32} className="text-amber-600 mx-auto mb-3" />
              <h3
                id="submit-dialog-title"
                className="text-[#0c1a2e] font-bold text-lg text-center mb-2"
              >
                End this test?
              </h3>
              <p className="text-slate-600 text-sm text-center leading-relaxed mb-6">
                You have{" "}
                <strong className="text-amber-700 tabular-nums">
                  {allQuestions().filter((q) => !answers[q._id]).length}
                </strong>{" "}
                question(s) without an answer. After submission you cannot change
                your responses.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitConfirm(false)}
                  className="flex-1 py-3 border border-[#d4cfc4] text-[#0c1a2e] text-sm font-semibold hover:bg-white transition-colors"
                >
                  Continue test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitConfirm(false);
                    handleSubmit();
                  }}
                  className="flex-1 py-3 bg-[#0c1a2e] text-white text-sm font-bold hover:bg-[#050d16] transition-colors border border-[#0c1a2e]"
                >
                  Submit now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section View ─────────────────────────────────────────────────────────────

function SectionView({
  section,
  answers,
  writingTexts,
  recording,
  speakingDone,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
}: {
  section: Section;
  answers: AnswerMap;
  writingTexts: Record<string, string>;
  recording: Record<string, boolean>;
  speakingDone: Record<string, boolean>;
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
}) {
  const isReading = section.sectionType === "reading_passage";
  const isListening = section.sectionType === "listening_part";
  const isWriting = section.sectionType === "writing_task";
  const isSpeaking = section.sectionType === "speaking_part";

  const Questions = (
    <div className="space-y-5">
      {section.instructions && (
        <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] px-4 py-3">
          <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-1.5">
            Instructions to candidates
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{section.instructions}</p>
        </div>
      )}
      {section.groups.map((group) => (
        <QuestionGroupView
          key={group._id}
          group={group}
          answers={answers}
          writingTexts={writingTexts}
          recording={recording}
          speakingDone={speakingDone}
          onAnswer={onAnswer}
          onWritingChange={onWritingChange}
          onWritingBlur={onWritingBlur}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          mode={mode}
        />
      ))}
    </div>
  );

  /* ── Reading: split-pane (question booklet + answer sheet feel) ─────── */
  if (isReading && section.passageText) {
    return (
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="w-1/2 min-w-0 shrink-0 overflow-y-auto border-r border-[#d4cfc4] bg-[#faf9f6] shadow-[inset_-8px_0_24px_-12px_rgba(12,26,46,0.06)]">
          <div className="p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#d4cfc4]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a227]">
                Reading passage
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#0c1a2e] mb-4 leading-snug">
              {section.title}
            </h2>
            {section.passageImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={section.passageImage}
                alt="Passage illustration"
                className="w-full mb-5 border border-[#d4cfc4]"
              />
            )}
            <div className="text-slate-800 leading-[1.85] text-[15px] font-serif whitespace-pre-wrap selection:bg-amber-100">
              {section.passageText}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto bg-[#e8e4dc]">
          <div className="p-4 sm:p-6 max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
              Questions
            </p>
            {Questions}
          </div>
        </div>
      </div>
    );
  }

  /* ── Listening: audio header + questions ─────────────────────────────── */
  if (isListening) {
    return (
      <div className="h-full overflow-y-auto bg-[#e8e4dc]">
        <div className="max-w-3xl mx-auto p-5 space-y-5">
          {/* Audio player card */}
          {section.audioUrl && (
            <div className="bg-[#0c1a2e] border border-[#c9a227]/35 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#c9a227] flex items-center justify-center border border-[#e4c96a]/40">
                  <Headphones size={16} className="text-[#0c1a2e]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227] mb-0.5">
                    Listening
                  </p>
                  <p className="text-white font-semibold text-sm">{section.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Listen once only. Answer as you listen.</p>
                </div>
              </div>
              <audio controls className="w-full h-10 audio-dark" src={section.audioUrl}>
                <track kind="captions" />
              </audio>
            </div>
          )}
          {Questions}
        </div>
      </div>
    );
  }

  /* ── Writing ────────────────────────────────────────────────────────── */
  if (isWriting) {
    return (
      <div className="h-full overflow-y-auto bg-[#e8e4dc]">
        <div className="max-w-4xl mx-auto p-5 space-y-5">
          <div className="border-b border-[#d4cfc4] pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227] mb-1">Writing</p>
            <h2 className="text-lg font-bold text-[#0c1a2e] leading-snug">{section.title}</h2>
          </div>
          {Questions}
        </div>
      </div>
    );
  }

  /* ── Speaking ────────────────────────────────────────────────────────── */
  if (isSpeaking) {
    return (
      <div className="h-full overflow-y-auto bg-[#e8e4dc]">
        <div className="max-w-3xl mx-auto p-5 space-y-5">
          <div className="bg-[#0c1a2e] border border-[#c9a227]/35 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex items-center gap-4">
            <div className="w-10 h-10 bg-[#c9a227] flex items-center justify-center shrink-0 border border-[#e4c96a]/40">
              <MessageSquare size={18} className="text-[#0c1a2e]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227] mb-0.5">Speaking</p>
              <p className="text-white font-bold text-sm">{section.title}</p>
              <p className="text-slate-300 text-xs mt-0.5">Speak clearly. Your response is recorded for review.</p>
            </div>
          </div>
          {Questions}
        </div>
      </div>
    );
  }

  /* ── Default ─────────────────────────────────────────────────────────── */
  return (
    <div className="h-full overflow-y-auto bg-[#e8e4dc]">
      <div className="max-w-3xl mx-auto p-5 space-y-5">
        <div className="border-b border-[#d4cfc4] pb-3">
          <h2 className="text-lg font-bold text-[#0c1a2e] leading-snug">{section.title}</h2>
        </div>
        {Questions}
      </div>
    </div>
  );
}

// ─── Question Group View ──────────────────────────────────────────────────────

function QuestionGroupView({
  group,
  answers,
  writingTexts,
  recording,
  speakingDone,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
}: {
  group: QuestionGroup;
  answers: AnswerMap;
  writingTexts: Record<string, string>;
  recording: Record<string, boolean>;
  speakingDone: Record<string, boolean>;
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
}) {
  return (
    <div className="bg-[#faf9f6] border border-[#d4cfc4] shadow-[0_1px_3px_rgba(12,26,46,0.06)] overflow-hidden">
      <div className="bg-[#0c1a2e] text-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c9a227]">
            Questions {group.questionNumberStart}–{group.questionNumberEnd}
          </span>
          {group.title && (
            <span className="text-xs text-slate-300 font-medium truncate">
              · {group.title}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider border border-white/15 px-2 py-0.5">
          {group.questionType.replace(/_/g, " ")}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {group.instructions && (
          <div className="border border-[#d4cfc4] bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed">
            <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-wide mb-1">
              Task instructions
            </p>
            {group.instructions}
          </div>
        )}

        {/* Matching options legend */}
        {(group.questionType === "matching" || group.questionType === "matching_headings") &&
          group.matchingOptions && group.matchingOptions.length > 0 && (
          <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] p-4">
            <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-3">
              List of options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.matchingOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="shrink-0 w-6 h-6 bg-[#0c1a2e] text-white flex items-center justify-center text-xs font-bold border border-[#c9a227]/30">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-3">
          {group.questions.map((q) => (
            <QuestionView
              key={q._id}
              question={q}
              answer={answers[q._id] ?? ""}
              writingText={writingTexts[q._id] ?? ""}
              isRecording={recording[q._id] ?? false}
              speakingDone={speakingDone[q._id] ?? false}
              matchingOptions={group.matchingOptions}
              onAnswer={onAnswer}
              onWritingChange={onWritingChange}
              onWritingBlur={onWritingBlur}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              mode={mode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Individual Question View ─────────────────────────────────────────────────

function QuestionView({
  question,
  answer,
  writingText,
  isRecording,
  speakingDone,
  matchingOptions,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
}: {
  question: Question;
  answer: string;
  writingText: string;
  isRecording: boolean;
  speakingDone: boolean;
  matchingOptions?: string[];
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
}) {
  const qId = question._id;
  const qType = question.questionType;
  const isAnswered = !!answer;

  const effectiveMatchingOptions = matchingOptions ?? question.matchingOptions ?? [];

  return (
    <div
      className={`border transition-all ${
        isAnswered
          ? "border-emerald-400/60 bg-white shadow-[inset_3px_0_0_0_#10b981]"
          : "border-[#d4cfc4] bg-white"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold border ${
            isAnswered
              ? "bg-[#0c1a2e] text-[#c9a227] border-[#c9a227]/40"
              : "bg-[#faf9f6] border-[#d4cfc4] text-slate-600"
          }`}
        >
          {question.questionNumber}
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          {/* Question text */}
          {question.questionText && (
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{question.questionText}</p>
          )}

          {/* Question image */}
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.imageUrl} alt={`Question ${question.questionNumber} illustration`} className="max-w-full rounded-lg border border-slate-200" />
          )}

          {/* ── Multiple Choice ──────────────────────────────────────── */}
          {qType === "multiple_choice" && question.options && (
            <div className="space-y-2">
              {question.options.map((opt) => (
                <label
                  key={opt.label}
                  className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all text-sm ${
                    answer === opt.label
                      ? "bg-[#0c1a2e] border-[#0c1a2e] text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-[#0c1a2e]/40 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${qId}`}
                    value={opt.label}
                    checked={answer === opt.label}
                    onChange={() => onAnswer(qId, opt.label, qType)}
                    className="mt-0.5 accent-[#0c1a2e] shrink-0"
                  />
                  <span>
                    <strong className={answer === opt.label ? "text-[#c9a227]" : "text-slate-500"}>{opt.label}.</strong>{" "}
                    {opt.text}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* ── True / False / Not Given ─────────────────────────────── */}
          {qType === "true_false_not_given" && (
            <div className="flex flex-wrap gap-2">
              {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => onAnswer(qId, opt, qType)}
                  className={`px-5 py-2 rounded-xl border text-xs font-bold tracking-wide transition-all ${
                    answer === opt
                      ? "bg-[#0c1a2e] text-white border-[#0c1a2e] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-[#0c1a2e] hover:text-[#0c1a2e]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* ── Fill in the Blank / Short Answer / Sentence/Summary Completion ── */}
          {(qType === "fill_blank" || qType === "short_answer" || qType === "sentence_completion" || qType === "summary_completion") && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => onAnswer(qId, e.target.value, qType)}
                placeholder="Write your answer here…"
                className={`border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0c1a2e] focus:border-[#0c1a2e] focus:outline-none transition-all w-full max-w-sm ${isAnswered ? "border-emerald-300 bg-white" : "border-slate-200 bg-white"}`}
              />
              {isAnswered && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
            </div>
          )}

          {/* ── Matching / Matching Headings ─────────────────────────── */}
          {(qType === "matching" || qType === "matching_headings") && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Select match"
                value={answer}
                onChange={(e) => onAnswer(qId, e.target.value, qType)}
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0c1a2e] focus:border-[#0c1a2e] focus:outline-none bg-white appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">— Select answer —</option>
                {effectiveMatchingOptions.map((opt, i) => (
                  <option key={i} value={String.fromCharCode(65 + i)}>
                    {String.fromCharCode(65 + i)} — {opt.length > 50 ? opt.slice(0, 50) + "…" : opt}
                  </option>
                ))}
              </select>
              {isAnswered && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
            </div>
          )}

          {/* ── Essay / Writing ──────────────────────────────────────── */}
          {qType === "essay" && (
            <div className="space-y-3">
              {question.wordLimit && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText size={12} />
                  <span>Minimum <strong>{question.wordLimit}</strong> words required</span>
                </div>
              )}
              <textarea
                rows={14}
                value={writingText || answer}
                onChange={(e) => onWritingChange(qId, e.target.value)}
                onBlur={() => onWritingBlur(qId)}
                placeholder="Begin writing your response here…"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-[#0c1a2e] focus:border-[#0c1a2e] focus:outline-none resize-y transition-all"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 rounded-full transition-all ${(() => {
                    const wc = (writingText || answer).trim().split(/\s+/).filter(Boolean).length;
                    const target = question.wordLimit ?? 250;
                    const pct = Math.min(100, (wc / target) * 100);
                    return pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-slate-300";
                  })()} w-24`} />
                  <span className="text-xs text-slate-500 font-medium">
                    {(writingText || answer).trim().split(/\s+/).filter(Boolean).length} words
                    {question.wordLimit ? ` / ${question.wordLimit} minimum` : ""}
                  </span>
                </div>
                {mode === "practice" && (
                  <span className="text-xs text-[#0c1a2e] font-medium bg-[#0c1a2e]/8 px-2.5 py-1 rounded-full">
                    AI feedback after submission
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Speaking ─────────────────────────────────────────────── */}
          {qType === "speaking" && (
            <div className="space-y-3">
              {question.speakingPrompt && (
                <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] p-4">
                  <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-1.5">
                    Candidate cue card
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{question.speakingPrompt}</p>
                  {question.speakingDuration && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock size={11} /> {question.speakingDuration}s recommended
                    </p>
                  )}
                </div>
              )}

              {speakingDone ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                  <CheckCircle size={16} /> Recording submitted successfully
                </div>
              ) : isRecording ? (
                <div className="flex items-center gap-4 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <button
                    onClick={() => onStopRecording(qId)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    <MicOff size={15} /> Stop Recording
                  </button>
                  <div className="flex items-center gap-2 text-red-600 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                    Recording in progress…
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => onStartRecording(qId)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0c1a2e] text-white rounded-xl text-sm font-bold hover:bg-[#050d16] transition-colors shadow-sm"
                  >
                    <Mic size={15} /> Start Recording
                  </button>
                  <p className="text-xs text-slate-400 mt-2">Ensure your microphone is enabled. Speak clearly when recording.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Answered indicator */}
        {isAnswered && qType !== "essay" && qType !== "speaking" && (
          <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );
}

// ─── Page Export (Suspense required for useSearchParams) ─────────────────────

export default function TakeExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh bg-[#e8e4dc]">
          <div className="text-center px-6">
            <div className="w-14 h-14 rounded-full border-[3px] border-[#0c1a2e] border-t-transparent animate-spin mx-auto mb-5" />
            <p className="text-[#0c1a2e] font-semibold text-xs tracking-[0.2em] uppercase">
              Preparing your test
            </p>
            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              Please wait. Do not refresh this page.
            </p>
          </div>
        </div>
      }
    >
      <TakeExamContent />
    </Suspense>
  );
}
