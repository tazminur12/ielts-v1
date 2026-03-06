"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, AlertCircle, CheckCircle, Mic, MicOff, Send,
  Loader2, ChevronLeft, ChevronRight, BookOpen,
  Headphones, PenLine, MessageSquare, FileText,
} from "lucide-react";

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

        const nested = buildNestedTest(rawTest, sections ?? [], groups ?? [], questions ?? []);
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

        const totalSecs = rawTest.duration > 0 ? rawTest.duration * 60 : 0;
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
    if (saveInFlight.current.has(questionId)) return;
    saveInFlight.current.add(questionId);

    const body: Record<string, unknown> = { attemptId, questionId, questionType };
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
  }, [attemptId]);

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
      <div className="flex items-center justify-center h-screen bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#1a3a5c] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#1a3a5c] font-semibold text-sm tracking-wide uppercase">Loading Examination</p>
          <p className="text-slate-400 text-xs mt-1">Please wait…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f4f8]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-lg mb-2">Unable to Load Exam</p>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-[#1a3a5c] text-white rounded-lg text-sm font-semibold hover:bg-[#0f2540] transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] overflow-hidden font-sans">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="bg-[#1a3a5c] text-white px-5 py-0 flex items-stretch justify-between shrink-0 shadow-lg z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 py-3">
          <div className="w-8 h-8 bg-[#c8a84b] rounded flex items-center justify-center">
            <span className="text-[#1a3a5c] font-black text-xs">IB</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">IELTS Band</p>
            <p className="text-[#c8a84b] text-[10px] font-medium tracking-widest uppercase">{test.module} — {test.examType}</p>
          </div>
        </div>

        {/* Title */}
        <div className="hidden lg:flex items-center">
          <p className="text-slate-300 text-sm font-medium truncate max-w-xs">{test.title}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 py-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Progress</span>
            <span className="text-white font-semibold text-sm">{answeredCount} / {totalQuestions}</span>
          </div>

          {test.duration > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-base transition-colors ${
              isCriticalTime
                ? "bg-red-600/30 text-red-300 animate-pulse ring-1 ring-red-500/50"
                : isLowTime
                ? "bg-amber-500/20 text-amber-300"
                : "bg-[#c8a84b]/20 text-[#c8a84b]"
            }`}>
              <Clock size={15} />
              {formatTime(timeLeft)}
              {isCriticalTime && <span className="text-[10px] font-bold tracking-widest uppercase ml-1">!</span>}
            </div>
          )}

          <button
            onClick={confirmAndSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-[#c8a84b] hover:bg-[#b8943b] disabled:opacity-60 text-[#1a3a5c] font-bold text-sm px-5 py-2 rounded-lg transition-colors shadow-sm"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit
          </button>
        </div>
      </header>

      {/* ── Section Tabs ────────────────────────────────────────────────── */}
      <div className="bg-[#0f2540] flex items-center gap-0 shrink-0 overflow-x-auto scrollbar-hide">
        {test.sections.map((sec, idx) => {
          const secTotal = sec.groups.flatMap((g) => g.questions).length;
          const secAnswered = sec.groups.flatMap((g) => g.questions).filter((q) => answers[q._id]).length;
          const active = idx === activeSectionIdx;
          return (
            <button
              key={sec._id}
              onClick={() => setActiveSectionIdx(idx)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                active
                  ? "text-[#c8a84b] border-[#c8a84b] bg-[#1a3a5c]"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#152a42]"
              }`}
            >
              {sectionIcon(sec.sectionType)}
              <span className="uppercase tracking-wider">{sec.title || `${sectionLabel(sec.sectionType)} ${sec.order}`}</span>
              <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${active ? "bg-[#c8a84b]/20 text-[#c8a84b]" : "bg-slate-700 text-slate-400"}`}>
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

      {/* ── Section Nav Footer ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <button
          onClick={() => setActiveSectionIdx((i) => Math.max(0, i - 1))}
          disabled={activeSectionIdx === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-[#1a3a5c] disabled:opacity-30 hover:underline transition-opacity"
        >
          <ChevronLeft size={16} /> Previous Section
        </button>

        <div className="flex items-center gap-2">
          {test.sections.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSectionIdx(i)}
              className={`rounded-full transition-all ${
                i === activeSectionIdx ? "w-6 h-2.5 bg-[#1a3a5c]" : "w-2.5 h-2.5 bg-slate-200 hover:bg-slate-400"
              }`}
              aria-label={`Section ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setActiveSectionIdx((i) => Math.min(test.sections.length - 1, i + 1))}
          disabled={activeSectionIdx === test.sections.length - 1}
          className="flex items-center gap-1.5 text-sm font-medium text-[#1a3a5c] disabled:opacity-30 hover:underline transition-opacity"
        >
          Next Section <ChevronRight size={16} />
        </button>
      </footer>

      {/* ── Submit Confirmation Modal ─────────────────────────────────────── */}
      {submitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <AlertCircle size={36} className="text-amber-500 mx-auto mb-4" />
            <h3 className="text-slate-800 font-bold text-lg text-center mb-2">Submit Examination?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              You have <strong className="text-amber-600">{allQuestions().filter((q) => !answers[q._id]).length} unanswered</strong> question(s).
              Once submitted, you cannot return to this test.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSubmitConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Continue Exam
              </button>
              <button
                onClick={() => { setSubmitConfirm(false); handleSubmit(); }}
                className="flex-1 py-2.5 bg-[#1a3a5c] text-white rounded-xl text-sm font-bold hover:bg-[#0f2540] transition-colors"
              >
                Submit Anyway
              </button>
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
        <div className="bg-blue-50 border-l-4 border-[#1a3a5c] px-4 py-3 rounded-r-lg">
          <p className="text-xs font-semibold text-[#1a3a5c] uppercase tracking-wide mb-1">Instructions</p>
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

  /* ── Reading: split-pane ─────────────────────────────────────────────── */
  if (isReading && section.passageText) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* Passage panel */}
        <div className="w-1/2 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#1a3a5c] rounded-full" />
              <h2 className="text-base font-bold text-[#1a3a5c]">{section.title}</h2>
            </div>
            {section.passageImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={section.passageImage} alt="Passage illustration" className="w-full rounded-lg mb-4 border border-slate-200" />
            )}
            <div className="prose prose-sm max-w-none text-slate-700 leading-[1.9] text-[14px] font-serif whitespace-pre-wrap selection:bg-yellow-200">
              {section.passageText}
            </div>
          </div>
        </div>
        {/* Questions panel */}
        <div className="flex-1 overflow-y-auto bg-[#f0f4f8]">
          <div className="p-5">{Questions}</div>
        </div>
      </div>
    );
  }

  /* ── Listening: audio header + questions ─────────────────────────────── */
  if (isListening) {
    return (
      <div className="h-full overflow-y-auto bg-[#f0f4f8]">
        <div className="max-w-3xl mx-auto p-5 space-y-5">
          {/* Audio player card */}
          {section.audioUrl && (
            <div className="bg-[#1a3a5c] rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#c8a84b] rounded-full flex items-center justify-center">
                  <Headphones size={16} className="text-[#1a3a5c]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{section.title}</p>
                  <p className="text-slate-400 text-xs">Listen carefully and answer the questions below</p>
                </div>
              </div>
              <audio controls className="w-full h-10 rounded-lg audio-dark" src={section.audioUrl}>
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
      <div className="h-full overflow-y-auto bg-[#f0f4f8]">
        <div className="max-w-4xl mx-auto p-5 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#1a3a5c] rounded-full" />
            <h2 className="text-base font-bold text-[#1a3a5c]">{section.title}</h2>
          </div>
          {Questions}
        </div>
      </div>
    );
  }

  /* ── Speaking ────────────────────────────────────────────────────────── */
  if (isSpeaking) {
    return (
      <div className="h-full overflow-y-auto bg-[#f0f4f8]">
        <div className="max-w-3xl mx-auto p-5 space-y-5">
          <div className="bg-[#1a3a5c] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-10 h-10 bg-[#c8a84b] rounded-full flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="text-[#1a3a5c]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{section.title}</p>
              <p className="text-slate-300 text-xs mt-0.5">Speak clearly into your microphone. Your response will be evaluated by AI.</p>
            </div>
          </div>
          {Questions}
        </div>
      </div>
    );
  }

  /* ── Default ─────────────────────────────────────────────────────────── */
  return (
    <div className="h-full overflow-y-auto bg-[#f0f4f8]">
      <div className="max-w-3xl mx-auto p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-[#1a3a5c] rounded-full" />
          <h2 className="text-base font-bold text-[#1a3a5c]">{section.title}</h2>
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Group header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Questions {group.questionNumberStart}–{group.questionNumberEnd}
          </span>
          {group.title && (
            <span className="text-xs text-slate-600 font-medium">· {group.title}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full uppercase font-semibold tracking-wide">
          {group.questionType.replace(/_/g, " ")}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {group.instructions && (
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="w-0.5 bg-amber-400 rounded-full shrink-0 self-stretch" />
            <p className="text-sm text-amber-900 leading-relaxed">{group.instructions}</p>
          </div>
        )}

        {/* Matching options legend */}
        {(group.questionType === "matching" || group.questionType === "matching_headings") &&
          group.matchingOptions && group.matchingOptions.length > 0 && (
          <div className="bg-[#1a3a5c]/5 border border-[#1a3a5c]/20 rounded-xl p-4">
            <p className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wider mb-3">Match with the following options</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.matchingOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#1a3a5c] text-white flex items-center justify-center text-xs font-bold">
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
    <div className={`rounded-xl border transition-all ${isAnswered ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50"}`}>
      <div className="flex items-start gap-3 p-4">
        {/* Question number badge */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isAnswered ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-200 text-slate-500"}`}>
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
                      ? "bg-[#1a3a5c] border-[#1a3a5c] text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-[#1a3a5c]/40 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${qId}`}
                    value={opt.label}
                    checked={answer === opt.label}
                    onChange={() => onAnswer(qId, opt.label, qType)}
                    className="mt-0.5 accent-[#1a3a5c] shrink-0"
                  />
                  <span>
                    <strong className={answer === opt.label ? "text-[#c8a84b]" : "text-slate-500"}>{opt.label}.</strong>{" "}
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
                      ? "bg-[#1a3a5c] text-white border-[#1a3a5c] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-[#1a3a5c] hover:text-[#1a3a5c]"
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
                className={`border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a3a5c] focus:border-[#1a3a5c] focus:outline-none transition-all w-full max-w-sm ${isAnswered ? "border-emerald-300 bg-white" : "border-slate-200 bg-white"}`}
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
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a3a5c] focus:border-[#1a3a5c] focus:outline-none bg-white appearance-none cursor-pointer min-w-[180px]"
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
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-[#1a3a5c] focus:border-[#1a3a5c] focus:outline-none resize-y transition-all"
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
                  <span className="text-xs text-[#1a3a5c] font-medium bg-[#1a3a5c]/8 px-2.5 py-1 rounded-full">
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
                <div className="bg-[#1a3a5c]/5 border border-[#1a3a5c]/15 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#1a3a5c] uppercase tracking-wide mb-1.5">Speaking Prompt</p>
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a5c] text-white rounded-xl text-sm font-bold hover:bg-[#0f2540] transition-colors shadow-sm"
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
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#f0f4f8]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#1a3a5c] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#1a3a5c] font-semibold text-sm tracking-wide uppercase">Loading Examination</p>
        </div>
      </div>
    }>
      <TakeExamContent />
    </Suspense>
  );
}
