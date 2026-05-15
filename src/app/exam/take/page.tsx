"use client";

import { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, AlertCircle, CheckCircle, Mic, MicOff, Send,
  Loader2, ChevronLeft, ChevronRight, BookOpen,
  Headphones, PenLine, MessageSquare, FileText, Volume2,
} from "lucide-react";
import { effectiveTestDurationMinutes } from "@/lib/testDuration";
import QuestionNavPanel from "@/components/exam/QuestionNavPanel";
import SpeakingSequentialView from "@/components/exam/SpeakingSequentialView";
import { ReadingSection, WritingSection, ListeningSection } from "@/components/exam/sections";
import type {
  LiveMetricsSnapshot,
  FollowUpQuestion,
  PronunciationAnalysisResult,
  HesitationReport,
} from "@/lib/speakingEnhancementComplete";
import {
  saveAudioBackup,
  deleteBackup,
  retryPendingBackups,
} from "@/lib/speakingBackup";
import { retryWithBackoff, uint8ArrayToBase64 } from "@/lib/examHelpers";

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
  const [attemptSessionId, setAttemptSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [error, setError] = useState("");

  const [writingTexts, setWritingTexts] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<Record<string, boolean>>({});
  const [recordingEndsAt, setRecordingEndsAt] = useState<Record<string, number>>({});
  const [speakingDone, setSpeakingDone] = useState<Record<string, boolean>>({});
  const [liveTurns, setLiveTurns] = useState<Record<string, { userText: string; aiText: string; aiAudioUrl: string | null }>>({});
  const [speakingAnalysis, setSpeakingAnalysis] = useState<Record<string, {
    pronunciation?: PronunciationAnalysisResult;
    hesitation?: HesitationReport;
    followUps?: FollowUpQuestion[];
  }>>({});
  const [speakingLiveMetrics, setSpeakingLiveMetrics] = useState<Record<string, LiveMetricsSnapshot | null>>({});
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiTextTyping, setAiTextTyping] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 
    'idle' | 'uploading' | 'retrying' | 'failed' | 'saved'>>({});
  const [retryAttempt, setRetryAttempt] = useState<Record<string, number>>({});
  const aiSpeakingRef = useRef(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<Record<string, MediaRecorder>>({});
  const audioChunksRef = useRef<Record<string, Blob[]>>({});
  const recordingTimeoutRef = useRef<Record<string, number>>({});
  const recordingStartedAtRef = useRef<Record<string, number>>({});
  const liveMetricsIntervalRef = useRef<Record<string, number>>({});
  const liveMetricsBusyRef = useRef<Record<string, boolean>>({});
  const activeRecordingQIdRef = useRef<string | null>(null);
  const saveInFlight = useRef<Set<string>>(new Set());
  const backupRetryInProgressRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // timerActive: true only after test loads with a non-zero duration
  const [timerActive, setTimerActive] = useState(false);
  // Ref keeps handleSubmit fresh so the auto-submit effect never uses stale closure
  const handleSubmitRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});
  // Ref to store stopRecording so cleanup and visibility handlers can access it without recreating effects
  const stopRecordingRef = useRef<(qId: string) => void>(() => {});
  // Ref to store handleQuestionSelect so uploadSpeaking can use the latest version without dependency
  const handleQuestionSelectRef = useRef<(qNum: number) => void>(() => {});
  // Refs to track uploadAudioToServer dependencies for retry callbacks
  const speakingMetaByIdRef = useRef<Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }>>({});
  const displayNumberByIdRef = useRef<Map<string, number>>(new Map());
  const moduleQuestionsRef = useRef<any[]>([]);
  const questionTextByIdRef = useRef<Map<string, string>>(new Map());
  const isLiveInterviewRef = useRef(false);

  const isSpeakingSection = useMemo(
    () => test?.sections?.[activeSectionIdx]?.sectionType === "speaking_part",
    [activeSectionIdx, test]
  );
  const isLiveInterview = mode === "live-interview" || isSpeakingSection;

  // Enhanced navigation state
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

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

  const questionTextById = useMemo(() => {
    const map = new Map<string, string>();
    if (!test) return map;
    for (const sec of test.sections ?? []) {
      for (const grp of sec.groups ?? []) {
        for (const q of grp.questions ?? []) {
          if (q?._id) map.set(String(q._id), q.questionText || q.speakingPrompt || "");
        }
      }
    }
    return map;
  }, [test]);

  const speakingMetaById = useMemo(() => {
    const out: Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }> = {};
    if (!test) return out;
    for (const sec of test.sections ?? []) {
      if (sec.sectionType !== "speaking_part") continue;
      const pn = Number((sec as any).partNumber || sec.order || 1);
      const part = (pn === 2 ? 2 : pn === 3 ? 3 : 1) as 1 | 2 | 3;
      const defaultMax = part === 2 ? 120 : part === 3 ? 60 : 30;
      const prepSeconds = part === 2 ? 60 : 0;
      for (const grp of sec.groups ?? []) {
        for (const q of grp.questions ?? []) {
          out[String(q._id)] = {
            part,
            maxSeconds: typeof q.speakingDuration === "number" ? q.speakingDuration : defaultMax,
            prepSeconds,
          };
        }
      }
    }
    return out;
  }, [test]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) { setError("No test ID provided."); setLoading(false); return; }

    (async () => {
      try {
        let initialSessionId =
          typeof globalThis !== "undefined" && (globalThis as any).crypto?.randomUUID
            ? (globalThis as any).crypto.randomUUID()
            : String(Date.now());

        try {
          const stored = localStorage.getItem(`test_session:${testId}`);
          if (stored && stored.trim()) initialSessionId = stored.trim();
        } catch {}

        const [testRes, attemptRes] = await Promise.all([
          fetch(`/api/tests/${testId}`),
          fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-attempt-session": initialSessionId },
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
        const attemptId = attemptData.attempt._id as string;
        let sessionId = (attemptData.sessionId || initialSessionId) as string;
        setTest(nested);
        setAttemptId(attemptId);
        setAttemptSessionId(sessionId);

        try {
          localStorage.setItem(`attempt_session:${attemptId}`, sessionId);
          localStorage.setItem(`test_session:${testId}`, sessionId);
        } catch {}

        if (durationMins > 0) {
          let stateRes = await fetch(`/api/exam/state?attemptId=${attemptId}`, {
            headers: { "x-attempt-session": sessionId },
          });

          if (stateRes.status === 409) {
            const takeoverSessionId =
              typeof globalThis !== "undefined" && (globalThis as any).crypto?.randomUUID
                ? (globalThis as any).crypto.randomUUID()
                : String(Date.now());
            const takeoverRes = await fetch(`/api/exam/state?attemptId=${attemptId}&takeover=1`, {
              headers: { "x-attempt-session": takeoverSessionId },
            });
            if (takeoverRes.ok) {
              sessionId = takeoverSessionId;
              setAttemptSessionId(sessionId);
              try {
                localStorage.setItem(`attempt_session:${attemptId}`, sessionId);
                localStorage.setItem(`test_session:${testId}`, sessionId);
              } catch {}
              stateRes = takeoverRes;
            } else {
              const err = await stateRes.json().catch(() => ({}));
              setError(err?.message || "Attempt is active in another session");
              return;
            }
          }

          if (stateRes.ok) {
            const state = await stateRes.json();
            const remaining = Number(state.remainingSeconds || 0);
            setTimeLeft(remaining);
            if (remaining > 0 && state.status === "in_progress") setTimerActive(true);
            if (remaining === 0 && state.status !== "in_progress") {
              router.push(`/exam/results?attemptId=${attemptId}`);
              return;
            }
          }
        }

        if (attemptData.attempt.status === "in_progress") {
          const ansRes = await fetch(`/api/answers?attemptId=${attemptId}`, {
            headers: { "x-attempt-session": sessionId },
          });
          if (ansRes.ok) {
            const saved = await ansRes.json();
            const map: AnswerMap = {};
            if (Array.isArray(saved)) {
              saved.forEach((a: Record<string, string>) => {
                map[a.questionId] = a.textAnswer ?? a.selectedOption ?? a.matchedAnswer ?? "";
              });
            }
            setAnswers(map);
          }
        }

        // Retry pending backups on page load
        if (!backupRetryInProgressRef.current) {
          backupRetryInProgressRef.current = true;
          try {
            await retryPendingBackups(async (qId, aId, blob) => {
              setUploadStatus(prev => ({ ...prev, [qId]: 'uploading' }));
              setRetryAttempt(prev => ({ ...prev, [qId]: 1 }));
              await retryWithBackoff(
                async () => await uploadAudioToServerViaRefs(qId, aId, blob),
                3,
                2000,
                (attempt) => {
                  setUploadStatus(prev => ({ ...prev, [qId]: 'retrying' }));
                  setRetryAttempt(prev => ({ ...prev, [qId]: attempt }));
                }
              );
              setUploadStatus(prev => ({ ...prev, [qId]: 'saved' }));
              setSpeakingDone(prev => ({ ...prev, [qId]: true }));
            });
          } finally {
            backupRetryInProgressRef.current = false;
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, testId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      if (!attemptId || backupRetryInProgressRef.current) return;
      backupRetryInProgressRef.current = true;
      try {
        await retryPendingBackups(async (qId, aId, blob) => {
          setUploadStatus(prev => ({ ...prev, [qId]: 'uploading' }));
          setRetryAttempt(prev => ({ ...prev, [qId]: 1 }));
          await retryWithBackoff(
            async () => await uploadAudioToServerViaRefs(qId, aId, blob),
            3,
            2000,
            (attempt) => {
              setUploadStatus(prev => ({ ...prev, [qId]: 'retrying' }));
              setRetryAttempt(prev => ({ ...prev, [qId]: attempt }));
            }
          );
          setUploadStatus(prev => ({ ...prev, [qId]: 'saved' }));
          setSpeakingDone(prev => ({ ...prev, [qId]: true }));
        });
      } finally {
        backupRetryInProgressRef.current = false;
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enhanced beforeunload handler to stop recordings
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const activeQIds = Object.entries(recording)
        .filter(([, isRec]) => isRec)
        .map(([qId]) => qId);

      if (activeQIds.length > 0 || submitting) {
        e.preventDefault();
        e.returnValue = 'Your exam recording is in progress. Leaving now will lose your recording. Are you sure?';

        activeQIds.forEach(qId => {
          const mr = mediaRecorderRef.current[qId];
          if (mr && mr.state !== 'inactive') {
            mr.stop();
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recording, submitting]);

  // Page Visibility API — handle mobile background
  useEffect(() => {
    let backgroundTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const activeQIds = Object.entries(recording)
          .filter(([, isRec]) => isRec)
          .map(([qId]) => qId);

        if (activeQIds.length > 0) {
          backgroundTimeout = setTimeout(() => {
            activeQIds.forEach(qId => stopRecordingRef.current(qId));
          }, 30000);
        }
      } else {
        if (backgroundTimeout) {
          clearTimeout(backgroundTimeout);
          backgroundTimeout = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (backgroundTimeout) clearTimeout(backgroundTimeout);
    };
  }, [recording]);

  // Cleanup on component unmount
  useEffect(() => {
    const mediaRecorders = mediaRecorderRef.current;
    const recordingTimeouts = recordingTimeoutRef.current;
    const liveMetricsIntervals = liveMetricsIntervalRef.current;

    return () => {
      Object.keys(mediaRecorders).forEach(qId => {
        const mr = mediaRecorders[qId];
        if (mr && mr.state !== 'inactive') {
          mr.stop();
        }
      });

      Object.values(recordingTimeouts).forEach(t => window.clearTimeout(t));
      Object.values(liveMetricsIntervals).forEach(id => window.clearInterval(id));
    };
  }, []);

  // Recording indicator in browser tab title
  useEffect(() => {
    const isRec = Object.values(recording).some(Boolean);
    const originalTitle = document.title;
    if (isRec) {
      document.title = '🔴 Recording in progress — Do not close';
    }
    return () => {
      document.title = originalTitle;
    };
  }, [recording]);

  useEffect(() => {
    if (!attemptId || !attemptSessionId || !timerActive) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/exam/state?attemptId=${attemptId}`, {
        headers: { "x-attempt-session": attemptSessionId },
      });
      if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        setError(err?.message || "Attempt is active in another session");
        setTimerActive(false);
        return;
      }
      if (!res.ok) return;
      const state = await res.json();
      const remaining = Number(state.remainingSeconds || 0);
      if (Number.isFinite(remaining)) {
        setTimeLeft((prev) => (Math.abs(prev - remaining) >= 3 ? remaining : prev));
      }
      if (state.status !== "in_progress") {
        setTimerActive(false);
        router.push(`/exam/results?attemptId=${attemptId}`);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [attemptId, attemptSessionId, router, timerActive]);

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
    if (!attemptSessionId) return;
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
        headers: { "Content-Type": "application/json", "x-attempt-session": attemptSessionId },
        body: JSON.stringify(body),
      });
    } finally {
      saveInFlight.current.delete(questionId);
    }
  }, [attemptId, attemptSessionId, questionNumberById]);

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

  const startLiveMetrics = useCallback(
    (questionId: string) => {
      if (liveMetricsIntervalRef.current[questionId]) return;
      liveMetricsIntervalRef.current[questionId] = window.setInterval(async () => {
        if (liveMetricsBusyRef.current[questionId]) return;
        const chunks = audioChunksRef.current[questionId];
        if (!chunks || chunks.length === 0) return;
        liveMetricsBusyRef.current[questionId] = true;
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const startedAt = recordingStartedAtRef.current[questionId] || Date.now();
          const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
          
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));
          
          const res = await fetch('/api/speaking/live-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: blob.type, durationSeconds: duration })
          });
          if (!res.ok) throw new Error('Failed to get live metrics');
          const { metrics } = await res.json();
          
          setSpeakingLiveMetrics((prev) => ({ ...prev, [questionId]: metrics }));
        } catch {
          // ignore live metrics errors
        } finally {
          liveMetricsBusyRef.current[questionId] = false;
        }
      }, 4000);
    },
    []
  );

  const stopLiveMetrics = useCallback((questionId: string) => {
    const id = liveMetricsIntervalRef.current[questionId];
    if (id) {
      window.clearInterval(id);
      delete liveMetricsIntervalRef.current[questionId];
    }
    liveMetricsBusyRef.current[questionId] = false;
  }, []);

  // ── Speaking ───────────────────────────────────────────────────────────────
  const startRecording = async (questionId: string) => {
    try {
      if (isLiveInterview && aiSpeakingRef.current) {
        alert("Please wait for the examiner to finish speaking.");
        return;
      }
      if (activeRecordingQIdRef.current && activeRecordingQIdRef.current !== questionId) {
        alert("Another speaking recording is already in progress.");
        return;
      }
      if (Object.values(recording).some(Boolean) && !recording[questionId]) {
        alert("Another speaking recording is already in progress.");
        return;
      }

      const meta = speakingMetaById[questionId];
      if (meta?.prepSeconds && meta.prepSeconds > 0 && attemptId) {
        const key = `speaking_prep:${attemptId}:${questionId}`;
        let startedAt = 0;
        try {
          const raw = localStorage.getItem(key);
          startedAt = raw ? Number(raw) : 0;
        } catch {}
        if (!Number.isFinite(startedAt) || startedAt <= 0) {
          startedAt = Date.now();
          try {
            localStorage.setItem(key, String(startedAt));
          } catch {}
        }
        const endAt = startedAt + meta.prepSeconds * 1000;
        if (Date.now() < endAt) {
          alert("Preparation time is not finished yet.");
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current[questionId] = [];
      mr.ondataavailable = (e) => audioChunksRef.current[questionId].push(e.data);
      mr.onstop = () => {
        const t = recordingTimeoutRef.current[questionId];
        if (t) {
          window.clearTimeout(t);
          delete recordingTimeoutRef.current[questionId];
        }
        stopLiveMetrics(questionId);
        setRecordingEndsAt((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        if (activeRecordingQIdRef.current === questionId) activeRecordingQIdRef.current = null;
        uploadSpeaking(questionId, stream);
      };
      mr.start();
      mediaRecorderRef.current[questionId] = mr;
      recordingStartedAtRef.current[questionId] = Date.now();
      startLiveMetrics(questionId);
      setRecording((prev) => ({ ...prev, [questionId]: true }));
      activeRecordingQIdRef.current = questionId;

      const maxSeconds = speakingMetaById[questionId]?.maxSeconds ?? 60;
      if (maxSeconds > 0) {
        const endsAt = Date.now() + maxSeconds * 1000;
        setRecordingEndsAt((prev) => ({ ...prev, [questionId]: endsAt }));
        recordingTimeoutRef.current[questionId] = window.setTimeout(() => stopRecording(questionId), maxSeconds * 1000);
      }
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = useCallback((questionId: string) => {
    const t = recordingTimeoutRef.current[questionId];
    if (t) {
      window.clearTimeout(t);
      delete recordingTimeoutRef.current[questionId];
    }
    stopLiveMetrics(questionId);
    setRecordingEndsAt((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    if (activeRecordingQIdRef.current === questionId) activeRecordingQIdRef.current = null;
    const mr = mediaRecorderRef.current[questionId];
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    setRecording((prev) => ({ ...prev, [questionId]: false }));
  }, [stopLiveMetrics]);

  // Update stopRecordingRef so cleanup and visibility handlers can access it
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    if (!attemptSessionId) return;
    setSubmitting(true);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-attempt-session": attemptSessionId },
        body: JSON.stringify({ action: "submit" }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg = (data as any)?.message || "Submission failed";
        if (msg === "Attempt is not in progress") {
          router.push(`/exam/results?attemptId=${attemptId}`);
          return;
        }
        throw new Error(msg);
      }

      const speakingQs = allQuestions().filter(
        (q) => q.questionType === "speaking" && answers[q._id] && answers[q._id] !== ""
      );
      speakingQs.forEach((q) => {
        fetch("/api/speaking/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, questionId: q._id }),
        }).catch(() => {});
      });

      const writingQs = allQuestions().filter((q) => q.questionType === "essay" && answers[q._id]);
      writingQs.forEach((q) => {
        fetch("/api/ai/writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, questionId: q._id }),
        }).catch(() => {});
      });

      router.push(`/exam/results?attemptId=${attemptId}`);
    } catch (e: any) {
      setSubmitting(false);
      if (!autoSubmit) alert(e?.message || "Failed to submit. Please try again.");
    }
  };

  // Keep the ref in sync so auto-submit effect always calls the latest version
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  useEffect(() => {
    if (!submitting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [submitting]);

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

  const activeSection = test?.sections[activeSectionIdx];
  const activeModule = useMemo(() => {
    const t = activeSection?.sectionType;
    if (t === "listening_part") return "listening";
    if (t === "reading_passage") return "reading";
    if (t === "writing_task") return "writing";
    if (t === "speaking_part") return "speaking";
    return "listening";
  }, [activeSection?.sectionType]);

  const displayNumberById = useMemo(() => {
    const map = new Map<string, number>();
    if (!test) return map;

    const counters: Record<string, number> = { listening: 0, reading: 0, writing: 0, speaking: 0 };
    for (const sec of test.sections ?? []) {
      const mod =
        sec.sectionType === "listening_part"
          ? "listening"
          : sec.sectionType === "reading_passage"
          ? "reading"
          : sec.sectionType === "writing_task"
          ? "writing"
          : "speaking";

      for (const grp of sec.groups ?? []) {
        for (const q of grp.questions ?? []) {
          counters[mod] += 1;
          map.set(String(q._id), counters[mod]);
        }
      }
    }
    return map;
  }, [test]);

  const moduleQuestions = useMemo(() => {
    if (!test) return [];
    return test.sections
      .filter((s) => {
        if (activeModule === "listening") return s.sectionType === "listening_part";
        if (activeModule === "reading") return s.sectionType === "reading_passage";
        if (activeModule === "writing") return s.sectionType === "writing_task";
        return s.sectionType === "speaking_part";
      })
      .flatMap((s) => s.groups.flatMap((g) => g.questions))
      .sort((a, b) => (displayNumberById.get(String(a._id)) || 0) - (displayNumberById.get(String(b._id)) || 0));
  }, [activeModule, displayNumberById, test]);

  const uploadAudioToServer = useCallback(async (questionId: string, attemptId: string, blob: Blob) => {
    if (!questionId || !attemptId) {
      throw new Error(`Missing required params: questionId=${questionId}, attemptId=${attemptId}`);
    }
    
    const meta = speakingMetaById[questionId];
    if (!meta) {
      console.error('No speaking metadata found for question:', questionId);
      throw new Error('Question metadata not found');
    }
    
    const fd = new FormData();
    fd.append("attemptId", attemptId);
    fd.append("partNumber", String(meta.part));
    fd.append("questionId", questionId);
    fd.append("audio", blob, "speaking.webm");
    
    if (isLiveInterview) {
      const currentDisplay = displayNumberById.get(String(questionId)) || 0;
      const idx = moduleQuestions.findIndex((q) => (displayNumberById.get(String(q._id)) || 0) === currentDisplay);
      const nextQ = idx >= 0 ? moduleQuestions[idx + 1] : null;
      const nextPrompt = nextQ ? String(nextQ.questionText || "").trim() : "";
      if (nextPrompt) fd.append("nextPrompt", nextPrompt);
    }

    let data: any = {};
    if (isLiveInterview) {
      const res = await fetch("/api/ai/speaking-interview-turn", { method: "POST", body: fd });
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Speaking interview API error:', res.status, data);
        const err = new Error(data?.message || `Live interview failed (${res.status})`) as Error & {
          status?: number;
          retryable?: boolean;
        };
        err.status = res.status;
        err.retryable = res.status >= 500 || res.status === 429;
        throw err;
      }
    } else {
      const res = await fetch("/api/speaking/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Speaking upload API error:', res.status, errData);
        const err = new Error(errData?.message || `Failed to upload speaking audio (${res.status})`) as Error & {
          status?: number;
          retryable?: boolean;
        };
        err.status = res.status;
        err.retryable = res.status >= 500 || res.status === 429;
        throw err;
      }
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));
      const analyzeRes = await fetch('/api/speaking/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType: blob.type, durationSeconds: 0, questionId, attemptId })
      });
      if (!analyzeRes.ok) {
        const analyzeErr = await analyzeRes.json().catch(() => ({}));
        console.error('Speaking analyze API error:', analyzeRes.status, analyzeErr);
        throw new Error('Failed to analyze speaking');
      }
      const { pronunciation, hesitation } = await analyzeRes.json();

      let followUps: any[] = [];
      if (isLiveInterview && data?.transcribedText) {
        const followupsRes = await fetch('/api/speaking/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: String(data?.transcribedText || "").trim(), 
            originalQuestion: questionTextById.get(String(questionId)) || "", 
            partNumber: meta?.part ?? 1, 
            speakingRate: 120, 
            hesitationRate: hesitation.ratePerMinute, 
            fluencyScore: hesitation.fluencyScore, 
            pronunciationScore: pronunciation.score 
          })
        });
        if (followupsRes.ok) {
          const followupsData = await followupsRes.json();
          followUps = followupsData.followUps;
        }
      }

      return { data, pronunciation, hesitation, followUps };
    } catch (analyzeErr) {
      console.error('Error in post-upload analysis:', analyzeErr);
      // Don't fail the whole upload if analysis fails - audio was already uploaded
      return { 
        data, 
        pronunciation: { score: 0, details: {} }, 
        hesitation: { ratePerMinute: 0, fluencyScore: 0, details: {} }, 
        followUps: [] 
      };
    }
  }, [isLiveInterview, speakingMetaById, displayNumberById, moduleQuestions, questionTextById]);

  // Keep refs in sync with dependencies for retry callbacks
  useEffect(() => {
    speakingMetaByIdRef.current = speakingMetaById;
    displayNumberByIdRef.current = displayNumberById;
    moduleQuestionsRef.current = moduleQuestions;
    questionTextByIdRef.current = questionTextById;
    isLiveInterviewRef.current = isLiveInterview;
  }, [speakingMetaById, displayNumberById, moduleQuestions, questionTextById, isLiveInterview]);

  // Typing effect: gradually show text character by character
  const typeTextEffect = useCallback((questionId: string, fullText: string, durationMs: number = 5000) => {
    const startTime = Date.now();
    const chars = fullText.length;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const charCount = Math.floor(progress * chars);
      const typedText = fullText.substring(0, charCount);
      
      setAiTextTyping((prev) => ({
        ...prev,
        [questionId]: typedText,
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, []);

  // Poll for TTS audio generation completion
  const pollForAiAudio = useCallback(async (answerId: string, maxWaitMs: number = 30000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const res = await fetch(`/api/answers/${answerId}?field=aiAudioUrl`);
        if (res.ok) {
          const answer = await res.json();
          if (answer.aiAudioUrl) {
            return answer.aiAudioUrl;
          }
        }
      } catch (err) {
        console.warn('Error polling for AI audio:', err);
      }
      // Wait 500ms before next poll
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    // Timeout - return null
    return null;
  }, []);

  // Simplified upload for retry callbacks (uses refs for latest dependencies)
  const uploadAudioToServerViaRefs = useCallback(async (questionId: string, attemptId: string, blob: Blob) => {
    if (!questionId || !attemptId) {
      throw new Error(`Missing required params: questionId=${questionId}, attemptId=${attemptId}`);
    }
    
    // Get metadata with fallback defaults if not found
    const meta = speakingMetaByIdRef.current[questionId] || {
      part: 1 as const,
      maxSeconds: 30,
      prepSeconds: 0,
    };
    
    if (!speakingMetaByIdRef.current[questionId]) {
      console.warn(`Speaking metadata not found for question ${questionId}, using defaults:`, meta);
    }
    
    const fd = new FormData();
    fd.append("attemptId", attemptId);
    fd.append("partNumber", String(meta.part));
    fd.append("questionId", questionId);
    fd.append("audio", blob, "speaking.webm");
    if (isLiveInterviewRef.current) {
      const currentDisplay = displayNumberByIdRef.current.get(String(questionId)) || 0;
      const idx = moduleQuestionsRef.current.findIndex((q) => (displayNumberByIdRef.current.get(String(q._id)) || 0) === currentDisplay);
      const nextQ = idx >= 0 ? moduleQuestionsRef.current[idx + 1] : null;
      const nextPrompt = nextQ ? String(nextQ.questionText || "").trim() : "";
      if (nextPrompt) fd.append("nextPrompt", nextPrompt);
    }

    let data: any = {};
    if (isLiveInterviewRef.current) {
      const res = await fetch("/api/ai/speaking-interview-turn", { method: "POST", body: fd });
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || `Live interview failed (${res.status})`) as Error & {
          status?: number;
          retryable?: boolean;
        };
        err.status = res.status;
        err.retryable = res.status >= 500 || res.status === 429;
        throw err;
      }
    } else {
      const res = await fetch("/api/speaking/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const err = new Error(errData?.message || `Failed to upload speaking audio (${res.status})`) as Error & {
          status?: number;
          retryable?: boolean;
        };
        err.status = res.status;
        err.retryable = res.status >= 500 || res.status === 429;
        throw err;
      }
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // ✅ Make analysis and followups requests in parallel instead of sequential
    const analyzePromise = fetch('/api/speaking/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64, mimeType: blob.type, durationSeconds: 0, questionId, attemptId })
    });

    const followupsPromise = (isLiveInterviewRef.current && data?.transcribedText)
      ? fetch('/api/speaking/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: String(data?.transcribedText || "").trim(), 
            originalQuestion: questionTextByIdRef.current.get(String(questionId)) || "", 
            partNumber: meta?.part ?? 1, 
            speakingRate: 120, 
            hesitationRate: 0,
            fluencyScore: 0,
            pronunciationScore: 0
          })
        })
      : Promise.resolve(null as any);

    // Wait for both requests in parallel
    const [analyzeRes, followupsRes] = await Promise.all([
      analyzePromise,
      followupsPromise
    ]);

    let pronunciation = { score: 0, details: {} } as any;
    let hesitation = { ratePerMinute: 0, fluencyScore: 0, details: {} } as any;
    if (analyzeRes.ok) {
      const analyzeData = await analyzeRes.json();
      pronunciation = analyzeData.pronunciation ?? pronunciation;
      hesitation = analyzeData.hesitation ?? hesitation;
    } else {
      console.warn('Speaking analyze API error:', analyzeRes.status);
    }

    let followUps: any[] = [];
    if (isLiveInterviewRef.current && followupsRes?.ok) {
      const followupsData = await followupsRes.json();
      followUps = followupsData.followUps;
    }

    return { data, pronunciation, hesitation, followUps };
  }, []);

  const uploadSpeaking = useCallback(async (questionId: string, stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
    if (!attemptId) return;
    
    // Prevent duplicate uploads for same question
    if (uploadStatus[questionId] === 'uploading' || uploadStatus[questionId] === 'retrying') {
      console.warn('Upload already in progress for question', questionId);
      return;
    }
    
    const chunks = audioChunksRef.current[questionId] || [];
    const blob = new Blob(chunks, { type: "audio/webm" });
    if (!chunks.length || blob.size === 0) {
      setUploadStatus(prev => ({ ...prev, [questionId]: 'failed' }));
      setAiSpeaking(false);
      aiSpeakingRef.current = false;
      alert("No audio was captured. Please record again.");
      return;
    }
    setUploadStatus(prev => ({ ...prev, [questionId]: 'uploading' }));
    setRetryAttempt(prev => ({ ...prev, [questionId]: 1 }));

    try {
      // Capture attemptId in local scope to avoid TypeScript non-null assertion
      const id = attemptId;
      const result = await retryWithBackoff(
        async () => await uploadAudioToServer(questionId, id, blob),
        3,
        2000,
        (attempt) => {
          setUploadStatus(prev => ({ ...prev, [questionId]: 'retrying' }));
          setRetryAttempt(prev => ({ ...prev, [questionId]: attempt }));
        }
      );

      if (isLiveInterview) {
        setAiSpeaking(true);
        aiSpeakingRef.current = true;
        if (aiAudioRef.current) {
          aiAudioRef.current.pause();
          aiAudioRef.current.src = "";
          aiAudioRef.current = null;
        }

        const transcribedText = String(result.data?.transcribedText || "").trim();
        setLiveTurns((prev) => ({
          ...prev,
          [questionId]: {
            userText: transcribedText,
            aiText: String(result.data?.aiText || "").trim(),
            aiAudioUrl: result.data?.aiAudioUrl || null,
          },
        }));

        setAnswers((prev) => ({
          ...prev,
          [questionId]: String(result.data?.audioUrl || "audio_submitted"),
        }));

        setSpeakingAnalysis((prev) => ({
          ...prev,
          [questionId]: { pronunciation: result.pronunciation, hesitation: result.hesitation, followUps: result.followUps },
        }));

        // ✅ Mark as speaking done so UI displays - this shows question immediately
        setSpeakingDone((prev) => ({ ...prev, [questionId]: true }));

        if (result.data?.aiAudioUrl) {
          const currentDisplay = displayNumberById.get(String(questionId)) || 0;
          const idx = moduleQuestions.findIndex((q) => (displayNumberById.get(String(q._id)) || 0) === currentDisplay);
          const nextQ = idx >= 0 ? moduleQuestions[idx + 1] : null;
          const audio = new Audio(String(result.data.aiAudioUrl));
          aiAudioRef.current = audio;
          audio.onended = () => {
            setAiSpeaking(false);
            aiSpeakingRef.current = false;
            aiAudioRef.current = null;
            if (nextQ) {
              const n = displayNumberById.get(String(nextQ._id));
              if (n) handleQuestionSelectRef.current(n);
            }
          };
          audio.onerror = () => {
            setAiSpeaking(false);
            aiSpeakingRef.current = false;
            aiAudioRef.current = null;
          };
          await audio.play().catch(() => {
            setAiSpeaking(false);
            aiSpeakingRef.current = false;
            aiAudioRef.current = null;
          });
          // Start typing effect while audio plays
          typeTextEffect(questionId, String(result.data?.aiText || "").trim(), audio.duration * 1000 || 5000);
        } else {
          // TTS is generating in background, poll for completion
          console.log('TTS generating in background for question:', questionId);
          const answerId = String(result.data?.answerId || "");
          if (answerId) {
            // Poll for audio URL (up to 30 seconds)
            const audioUrl = await pollForAiAudio(answerId, 30000);
            if (audioUrl) {
              console.log('AI audio ready:', audioUrl);
              const currentDisplay = displayNumberById.get(String(questionId)) || 0;
              const idx = moduleQuestions.findIndex((q) => (displayNumberById.get(String(q._id)) || 0) === currentDisplay);
              const nextQ = idx >= 0 ? moduleQuestions[idx + 1] : null;
              const audio = new Audio(audioUrl);
              aiAudioRef.current = audio;
              audio.onended = () => {
                setAiSpeaking(false);
                aiSpeakingRef.current = false;
                aiAudioRef.current = null;
                if (nextQ) {
                  const n = displayNumberById.get(String(nextQ._id));
                  if (n) handleQuestionSelectRef.current(n);
                }
              };
              audio.onerror = () => {
                setAiSpeaking(false);
                aiSpeakingRef.current = false;
                aiAudioRef.current = null;
              };
              // Update liveTurns with actual audio URL
              setLiveTurns((prev) => ({
                ...prev,
                [questionId]: {
                  ...prev[questionId],
                  aiAudioUrl: audioUrl,
                },
              }));
              await audio.play().catch(() => {
                setAiSpeaking(false);
                aiSpeakingRef.current = false;
                aiAudioRef.current = null;
              });
            } else {
              // Timeout waiting for audio - move to next question anyway
              console.warn('Timeout waiting for AI audio for question:', questionId);
              setAiSpeaking(false);
              aiSpeakingRef.current = false;
              const currentDisplay = displayNumberById.get(String(questionId)) || 0;
              const idx = moduleQuestions.findIndex((q) => (displayNumberById.get(String(q._id)) || 0) === currentDisplay);
              const nextQ = idx >= 0 ? moduleQuestions[idx + 1] : null;
              if (nextQ) {
                const n = displayNumberById.get(String(nextQ._id));
                if (n) handleQuestionSelectRef.current(n);
              }
            }
          } else {
            setAiSpeaking(false);
            aiSpeakingRef.current = false;
            const currentDisplay = displayNumberById.get(String(questionId)) || 0;
            const idx = moduleQuestions.findIndex((q) => (displayNumberById.get(String(q._id)) || 0) === currentDisplay);
            const nextQ = idx >= 0 ? moduleQuestions[idx + 1] : null;
            if (nextQ) {
              const n = displayNumberById.get(String(nextQ._id));
              if (n) handleQuestionSelectRef.current(n);
            }
          }
        }
      } else {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: "audio_submitted",
        }));

        setSpeakingAnalysis((prev) => ({
          ...prev,
          [questionId]: { pronunciation: result.pronunciation, hesitation: result.hesitation, followUps: [] },
        }));
      }

      setUploadStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      await deleteBackup(questionId);
      setSpeakingDone((prev) => ({ ...prev, [questionId]: true }));
    } catch (err: any) {
      await saveAudioBackup(questionId, attemptId, blob);
      setUploadStatus(prev => ({ ...prev, [questionId]: 'failed' }));
      setAiSpeaking(false);
      aiSpeakingRef.current = false;
      alert(err?.message || "Failed to upload speaking audio. Saved locally, will retry later.");
    }
  }, [attemptId, isLiveInterview, uploadAudioToServer, displayNumberById, moduleQuestions, uploadStatus, pollForAiAudio, typeTextEffect]);


  const answeredCount = useMemo(() => moduleQuestions.filter((q) => answers[q._id]).length, [answers, moduleQuestions]);
  const totalQuestions = moduleQuestions.length;
  const isCriticalTime = timerActive && timeLeft > 0 && timeLeft <= 60;   // last 1 min
  const isLowTime = timerActive && timeLeft > 60 && timeLeft < 300;       // last 5 min
  const isAnyRecording = useMemo(() => Object.values(recording).some(Boolean), [recording]);
  const activeSpeakingIncomplete = useMemo(() => {
    if (!activeSection) return false;
    if (activeSection.sectionType !== "speaking_part") return false;
    const qs = activeSection.groups.flatMap((g) => g.questions).filter((q) => q.questionType === "speaking");
    return qs.some((q) => !speakingDone[q._id]);
  }, [activeSection, speakingDone]);

  // Create answered questions set for navigation panel
  const answeredQuestionsSet = useMemo(() => {
    const set = new Set<string>();
    moduleQuestions.forEach((q) => {
      if (answers[q._id]) set.add(String(displayNumberById.get(String(q._id)) || 0));
    });
    return set;
  }, [answers, displayNumberById, moduleQuestions]);

  // Toggle mark for review
  const handleToggleReview = useCallback((qNum: number) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) {
        next.delete(qNum);
      } else {
        next.add(qNum);
      }
      return next;
    });
  }, []);

  // Jump to specific question
  const handleQuestionSelect = useCallback((qNum: number) => {
    const targetQuestion = moduleQuestions.find((q) => (displayNumberById.get(String(q._id)) || 0) === qNum);
    if (!targetQuestion) return;

    setCurrentQuestion(qNum);

    // Find the section that contains this question and switch to it
    for (let i = 0; i < test!.sections.length; i++) {
      const section = test!.sections[i];
      for (const group of section.groups) {
        if (group.questions.some((q) => q._id === targetQuestion._id)) {
          setActiveSectionIdx(i);
          return;
        }
      }
    }
  }, [displayNumberById, moduleQuestions, test]);

  // Update ref so uploadSpeaking can access latest version
  useEffect(() => {
    handleQuestionSelectRef.current = handleQuestionSelect;
  }, [handleQuestionSelect]);

  useEffect(() => {
    if (!activeSection) return;
    const first = activeSection.groups?.[0]?.questions?.[0];
    if (!first?._id) return;
    const n = displayNumberById.get(String(first._id));
    if (n && Number.isFinite(n)) setCurrentQuestion(n);
  }, [activeSectionIdx, activeModule, activeSection, displayNumberById]);

  // Next/Previous question handlers
  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < totalQuestions) {
      handleQuestionSelect(currentQuestion + 1);
    }
  }, [currentQuestion, totalQuestions, handleQuestionSelect]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestion > 1) {
      handleQuestionSelect(currentQuestion - 1);
    }
  }, [currentQuestion, handleQuestionSelect]);

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
          const lockForwardFromSpeaking = activeSpeakingIncomplete && idx > activeSectionIdx;
          return (
            <button
              key={sec._id}
              type="button"
              onClick={() => setActiveSectionIdx(idx)}
              disabled={isAnyRecording || lockForwardFromSpeaking}
              aria-label={`${sectionLabel(sec.sectionType)}: ${sec.title || `Part ${sec.order}`}`}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 min-h-11 ${
                active
                  ? "text-[#c9a227] border-[#c9a227] bg-[#0c1a2e]"
                  : "text-slate-500 border-transparent hover:text-slate-200 hover:bg-[#0c1a2e]/60"
              } disabled:opacity-35 disabled:cursor-not-allowed`}
            >
              {sectionIcon(sec.sectionType)}
              <span className="uppercase tracking-[0.08em] max-w-35 sm:max-w-none truncate">
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
            key={activeSection._id}
            section={activeSection}
            test={test}
            attemptId={attemptId}
            answers={answers}
            writingTexts={writingTexts}
            recording={recording}
            recordingEndsAt={recordingEndsAt}
            speakingDone={speakingDone}
            onAnswer={handleAnswer}
            onWritingChange={handleWritingChange}
            onWritingBlur={handleWritingBlur}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            mode={mode}
            speakingMetaById={speakingMetaById}
            isAnyRecording={isAnyRecording}
            displayNumberById={displayNumberById}
            liveTurns={liveTurns}
            isLiveInterview={isLiveInterview}
            aiSpeaking={aiSpeaking}
            aiTextTyping={aiTextTyping}
            speakingAnalysis={speakingAnalysis}
            speakingLiveMetrics={speakingLiveMetrics}
            uploadStatus={uploadStatus}
            retryAttempt={retryAttempt}
          />
        )}
      </main>

      {/* ── Question Navigation Panel ───────────────────────────────────── */}
      {(() => {
        const currentQ = moduleQuestions.find(
          (q) => (displayNumberById.get(String(q._id)) || 0) === currentQuestion
        );
        const isSpeaking = currentQ?.questionType === "speaking";
        const isCurrentSpeakingDone = currentQ ? speakingDone[currentQ._id] ?? false : true;

        return (
          <QuestionNavPanel
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answeredQuestions={answeredQuestionsSet}
            markedForReview={markedForReview}
            onQuestionSelect={handleQuestionSelect}
            onToggleReview={handleToggleReview}
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
            isCurrentQuestionSpeaking={isSpeaking}
            speakingDone={isCurrentSpeakingDone}
          />
        );
      })()}

      {/* ── Section navigation (footer) ─────────────────────────────────── */}
      <footer className="bg-[#faf9f6] border-t border-slate-200 px-3 sm:px-5 py-2 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSectionIdx((i) => Math.max(0, i - 1))}
          disabled={activeSectionIdx === 0 || isAnyRecording}
          className="flex items-center gap-1 text-xs font-semibold text-[#0c1a2e] disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous part</span>
        </button>

        <div className="flex items-center gap-1.5">
          {test.sections.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSectionIdx(i)}
              disabled={isAnyRecording}
              className={`h-1.5 rounded-full transition-all ${
                i === activeSectionIdx
                  ? "w-6 bg-[#c9a227]"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Part ${i + 1}`}
              aria-current={i === activeSectionIdx ? "step" : undefined}
            />
          ))}
        </div>

        {activeSectionIdx === test.sections.length - 1 ? (
          <button
            type="button"
            onClick={() => setSubmitConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0c1a2e] bg-[#c9a227] px-3 py-1.5 hover:bg-[#b89220] transition-colors border border-[#dfc45a]/50"
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
            disabled={isAnyRecording || activeSpeakingIncomplete}
            className="flex items-center gap-1 text-xs font-semibold text-[#0c1a2e] hover:opacity-80 transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next part</span> <ChevronRight size={16} />
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

      {submitting && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-6"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Submitting exam"
        >
          <div className="absolute inset-0 bg-[#0c1a2e]/70 backdrop-blur-md" />
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-1 rounded-3xl bg-linear-to-br from-[#c9a227] to-[#0c1a2e] opacity-20 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl shadow-black/20">
              <div className="h-1 w-full bg-linear-to-r from-[#c9a227] to-[#0c1a2e] animate-pulse" />
              <div className="px-8 py-10 text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-[#c9a227]/30 animate-[spin_3s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#c9a227]/30 animate-[spin_2s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 rounded-full bg-[#c9a227]/20 animate-pulse" />
                  <Loader2 className="relative h-9 w-9 text-[#0c1a2e] animate-spin" />
                </div>

                <h2 className="text-lg font-extrabold tracking-tight text-[#0c1a2e]">
                  Submitting your answers
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Finalizing your attempt and preparing results — please keep this tab open.
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
                      className={`h-2 w-2 rounded-full bg-[#c9a227] animate-bounce [animation-duration:0.9s] ${delayClass}`}
                    />
                  ))}
                </div>

                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-3/5 max-w-full rounded-full bg-linear-to-r from-[#c9a227] to-[#0c1a2e] animate-pulse" />
                </div>
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
  test,
  attemptId,
  answers,
  writingTexts,
  recording,
  recordingEndsAt,
  speakingDone,
  liveTurns,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
  speakingMetaById,
  isAnyRecording,
  displayNumberById,
  isLiveInterview,
  aiSpeaking,
  aiTextTyping,
  speakingAnalysis,
  speakingLiveMetrics,
  uploadStatus,
  retryAttempt,
}: {
  section: Section;
  test: TestData | null;
  attemptId: string | null;
  answers: AnswerMap;
  writingTexts: Record<string, string>;
  recording: Record<string, boolean>;
  recordingEndsAt: Record<string, number>;
  speakingDone: Record<string, boolean>;
  liveTurns: Record<string, { userText: string; aiText: string; aiAudioUrl: string | null }>;
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
  speakingMetaById: Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }>;
  isAnyRecording: boolean;
  displayNumberById: Map<string, number>;
  isLiveInterview: boolean;
  aiSpeaking: boolean;
  aiTextTyping: Record<string, string>;
  speakingAnalysis: Record<string, {
    pronunciation?: PronunciationAnalysisResult;
    hesitation?: HesitationReport;
    followUps?: FollowUpQuestion[];
  }>;
  speakingLiveMetrics: Record<string, LiveMetricsSnapshot | null>;
  uploadStatus: Record<string, 'idle' | 'uploading' | 'retrying' | 'failed' | 'saved'>;
  retryAttempt: Record<string, number>;
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
          attemptId={attemptId}
          answers={answers}
          writingTexts={writingTexts}
          recording={recording}
          recordingEndsAt={recordingEndsAt}
          speakingDone={speakingDone}
          liveTurns={liveTurns}
          onAnswer={onAnswer}
          onWritingChange={onWritingChange}
          onWritingBlur={onWritingBlur}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          mode={mode}
          speakingMetaById={speakingMetaById}
          isAnyRecording={isAnyRecording}
          displayNumberById={displayNumberById}
          isLiveInterview={isLiveInterview}
          aiSpeaking={aiSpeaking}
          aiTextTyping={aiTextTyping}
          speakingAnalysis={speakingAnalysis}
          speakingLiveMetrics={speakingLiveMetrics}
          forceSpeaking={isSpeaking}
          uploadStatus={uploadStatus}
          retryAttempt={retryAttempt}
        />
      ))}
    </div>
  );

  /* ── Reading: split-pane (question booklet + answer sheet feel) ─────── */
  if (isReading && section.passageText) {
    return (
      <ReadingSection section={section}>
        {Questions}
      </ReadingSection>
    );
  }
  /* ── Listening: audio header + questions ─────────────────────────────── */
  if (isListening) {
    return (
      <ListeningSection section={section}>
        {Questions}
      </ListeningSection>
    );
  }

  /* ── Writing ────────────────────────────────────────────────────────── */
  if (isWriting) {
    return (
      <WritingSection section={section}>
        {Questions}
      </WritingSection>
    );
  }

  /* ── Speaking ────────────────────────────────────────────────────────── */
  if (isSpeaking) {
    const speakingSections = test?.sections.filter(s => s.sectionType === "speaking_part") || [];
    if (attemptId) {
      return (
        <SpeakingSequentialView
          sections={speakingSections}
          attemptId={attemptId}
          answers={answers}
          recording={recording}
          recordingEndsAt={recordingEndsAt}
          speakingDone={speakingDone}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          speakingMetaById={speakingMetaById}
          isLiveInterview={isLiveInterview}
          aiSpeaking={aiSpeaking}
          liveTurns={liveTurns}
          speakingAnalysis={speakingAnalysis}
          speakingLiveMetrics={speakingLiveMetrics}
          uploadStatus={uploadStatus}
          retryAttempt={retryAttempt}
        />
      );
    }
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
  attemptId,
  answers,
  writingTexts,
  recording,
  recordingEndsAt,
  speakingDone,
  liveTurns,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
  speakingMetaById,
  isAnyRecording,
  displayNumberById,
  isLiveInterview,
  aiSpeaking,
  aiTextTyping,
  speakingAnalysis,
  speakingLiveMetrics,
  forceSpeaking,
  uploadStatus,
  retryAttempt,
}: {
  group: QuestionGroup;
  attemptId: string | null;
  answers: AnswerMap;
  writingTexts: Record<string, string>;
  recording: Record<string, boolean>;
  recordingEndsAt: Record<string, number>;
  speakingDone: Record<string, boolean>;
  liveTurns: Record<string, { userText: string; aiText: string; aiAudioUrl: string | null }>;
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
  speakingMetaById: Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }>;
  isAnyRecording: boolean;
  displayNumberById: Map<string, number>;
  isLiveInterview: boolean;
  aiSpeaking: boolean;
  aiTextTyping: Record<string, string>;
  speakingAnalysis: Record<string, {
    pronunciation?: PronunciationAnalysisResult;
    hesitation?: HesitationReport;
    followUps?: FollowUpQuestion[];
  }>;
  speakingLiveMetrics: Record<string, LiveMetricsSnapshot | null>;
  forceSpeaking: boolean;
  uploadStatus: Record<string, 'idle' | 'uploading' | 'retrying' | 'failed' | 'saved'>;
  retryAttempt: Record<string, number>;
}) {
  const groupNumbers = group.questions
    .map((q) => displayNumberById.get(String(q._id)) || 0)
    .filter((n) => n > 0);
  const groupStart = groupNumbers.length ? Math.min(...groupNumbers) : group.questionNumberStart;
  const groupEnd = groupNumbers.length ? Math.max(...groupNumbers) : group.questionNumberEnd;
  const groupTypeLabel = forceSpeaking ? "speaking" : group.questionType;

  return (
    <div className="bg-[#faf9f6] border border-[#d4cfc4] shadow-[0_1px_3px_rgba(12,26,46,0.06)] overflow-hidden">
      <div className="bg-[#0c1a2e] text-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c9a227]">
            Questions {groupStart}–{groupEnd}
          </span>
          {group.title && (
            <span className="text-xs text-slate-300 font-medium truncate">
              · {group.title}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider border border-white/15 px-2 py-0.5">
          {groupTypeLabel.replace(/_/g, " ")}
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
              displayNumber={displayNumberById.get(String(q._id)) || q.questionNumber}
              answer={answers[q._id] ?? ""}
              writingText={writingTexts[q._id] ?? ""}
              isRecording={recording[q._id] ?? false}
              recordingEndsAt={recordingEndsAt[q._id] ?? null}
              speakingDone={speakingDone[q._id] ?? false}
              liveTurn={liveTurns[q._id] ?? null}
              forceSpeaking={forceSpeaking}
              matchingOptions={group.matchingOptions}
              onAnswer={onAnswer}
              onWritingChange={onWritingChange}
              onWritingBlur={onWritingBlur}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              mode={mode}
              attemptId={attemptId}
              speakingMeta={speakingMetaById[q._id] ?? null}
              isAnyRecording={isAnyRecording}
              isLiveInterview={isLiveInterview}
              aiSpeaking={aiSpeaking}
              aiTextTyping={aiTextTyping[q._id] ?? ""}
              speakingAnalysis={speakingAnalysis[q._id] ?? null}
              liveMetrics={speakingLiveMetrics[q._id] ?? null}
              uploadStatus={uploadStatus[q._id] ?? 'idle'}
              retryAttempt={retryAttempt[q._id] ?? 0}
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
  displayNumber,
  answer,
  writingText,
  isRecording,
  recordingEndsAt,
  speakingDone,
  liveTurn,
  forceSpeaking,
  matchingOptions,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
  attemptId,
  speakingMeta,
  isAnyRecording,
  isLiveInterview,
  aiSpeaking,
  aiTextTyping,
  speakingAnalysis,
  liveMetrics,
  uploadStatus,
  retryAttempt,
}: {
  question: Question;
  displayNumber: number;
  answer: string;
  writingText: string;
  isRecording: boolean;
  recordingEndsAt: number | null;
  speakingDone: boolean;
  liveTurn: { userText: string; aiText: string; aiAudioUrl: string | null } | null;
  forceSpeaking: boolean;
  matchingOptions?: string[];
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
  attemptId: string | null;
  speakingMeta: { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number } | null;
  isAnyRecording: boolean;
  isLiveInterview: boolean;
  aiSpeaking: boolean;
  aiTextTyping: string;
  speakingAnalysis: {
    pronunciation?: PronunciationAnalysisResult;
    hesitation?: HesitationReport;
    followUps?: FollowUpQuestion[];
  } | null;
  liveMetrics: LiveMetricsSnapshot | null;
  uploadStatus: 'idle' | 'uploading' | 'retrying' | 'failed' | 'saved';
  retryAttempt: number;
}) {
  const qId = question._id;
  const qType = forceSpeaking ? "speaking" : question.questionType;
  const isAnswered = !!answer;

  const effectiveMatchingOptions = matchingOptions ?? question.matchingOptions ?? [];

  const [now, setNow] = useState(() => Date.now());
  const [prepNotes, setPrepNotes] = useState('');

  const prepEndAt = useMemo(() => {
    if (qType !== "speaking") return null;
    if (!speakingMeta || speakingMeta.prepSeconds <= 0) return null;
    if (speakingDone) return null;
    if (!attemptId) return null;

    const key = `speaking_prep:${attemptId}:${qId}`;
    let startedAt = 0;
    try {
      const raw = localStorage.getItem(key);
      startedAt = raw ? Number(raw) : 0;
    } catch {}
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      try {
        localStorage.setItem(key, String(startedAt));
      } catch {}
    }
    return startedAt + speakingMeta.prepSeconds * 1000;
  }, [attemptId, qId, qType, speakingDone, speakingMeta]);

  useEffect(() => {
    if (qType !== "speaking") return;
    if (!isRecording && !prepEndAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (!isRecording && prepEndAt && t >= prepEndAt) {
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRecording, prepEndAt, qType]);

  const prepRemaining =
    prepEndAt && now < prepEndAt ? Math.max(0, Math.ceil((prepEndAt - now) / 1000)) : 0;

  const speakingRemaining =
    recordingEndsAt && now < recordingEndsAt ? Math.max(0, Math.ceil((recordingEndsAt - now) / 1000)) : null;

  const speakingLockedByOtherRecording = qType === "speaking" && !isRecording && isAnyRecording;
  const speakingLockedByAi = qType === "speaking" && isLiveInterview && aiSpeaking;

  const prepStartedAnnounceKey =
    attemptId && qType === "speaking" ? `speaking_prep_announce_start:${attemptId}:${qId}` : "";
  const prepEndedAnnounceKey =
    attemptId && qType === "speaking" ? `speaking_prep_announce_end:${attemptId}:${qId}` : "";

  useEffect(() => {
    if (!isLiveInterview) return;
    if (qType !== "speaking") return;
    if (!attemptId) return;
    if (!speakingMeta?.prepSeconds || speakingMeta.prepSeconds <= 0) return;
    if (!prepEndAt) return;
    if (speakingDone) return;

    const run = async () => {
      try {
        if (prepRemaining > 0) {
          let already = false;
          try {
            already = localStorage.getItem(prepStartedAnnounceKey) === "1";
          } catch {}
          if (!already) {
            const text = "You have one minute to prepare. Your preparation time starts now.";
            const res = await fetch("/api/ai/speaking-interview-tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.audioUrl) {
              const a = new Audio(String(data.audioUrl));
              a.play().catch(() => {});
            }
            try {
              localStorage.setItem(prepStartedAnnounceKey, "1");
            } catch {}
          }
          return;
        }

        let alreadyEnd = false;
        try {
          alreadyEnd = localStorage.getItem(prepEndedAnnounceKey) === "1";
        } catch {}
        if (!alreadyEnd) {
          const text = "Preparation time is over. Please start speaking now.";
          const res = await fetch("/api/ai/speaking-interview-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.audioUrl) {
            const a = new Audio(String(data.audioUrl));
            a.play().catch(() => {});
          }
          try {
            localStorage.setItem(prepEndedAnnounceKey, "1");
          } catch {}
        }
      } catch {}
    };

    void run();
  }, [
    attemptId,
    isLiveInterview,
    prepEndAt,
    prepEndedAnnounceKey,
    prepRemaining,
    prepStartedAnnounceKey,
    qId,
    qType,
    speakingDone,
    speakingMeta?.prepSeconds,
  ]);

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
          {displayNumber}
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          {/* Question text */}
          {question.questionText && (
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{question.questionText}</p>
          )}

          {/* Question image */}
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.imageUrl} alt={`Question ${displayNumber} illustration`} className="max-w-full rounded-lg border border-slate-200" />
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
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0c1a2e] focus:border-[#0c1a2e] focus:outline-none bg-white appearance-none cursor-pointer min-w-45"
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

              {uploadStatus !== 'idle' && !speakingDone && (
                <div className="space-y-2">
                  {uploadStatus === 'uploading' && (
                    <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </div>
                  )}
                  {uploadStatus === 'retrying' && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                      <AlertCircle size={16} /> Retrying ({retryAttempt}/3)...
                    </div>
                  )}
                  {uploadStatus === 'failed' && (
                    <div className="flex items-center gap-2 text-red-600 text-sm font-semibold bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                      <AlertCircle size={16} /> Upload failed. Saved locally. Will retry when connection restores.
                    </div>
                  )}
                  {uploadStatus === 'saved' && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                      <CheckCircle size={16} /> Recording submitted
                    </div>
                  )}
                </div>
              )}

              {speakingDone ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                    <CheckCircle size={16} /> Recording submitted successfully
                  </div>
                  {isLiveInterview && liveTurn && (
                    <div className="border border-[#d4cfc4] bg-white px-4 py-3 space-y-3">
                      {liveTurn.userText && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">You</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{liveTurn.userText}</p>
                        </div>
                      )}
                      {liveTurn.aiText && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Examiner</p>
                          <p className="text-sm text-slate-800 leading-relaxed font-medium">
                            {aiSpeaking && aiTextTyping ? (
                              <>
                                {aiTextTyping}
                                <span className="inline-block w-2 h-5 ml-1 bg-slate-800 animate-pulse"></span>
                              </>
                            ) : (
                              liveTurn.aiText
                            )}
                          </p>
                          {liveTurn.aiAudioUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const a = new Audio(liveTurn.aiAudioUrl as string);
                                a.play().catch(() => {});
                              }}
                              className="mt-2 inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              <Volume2 size={14} /> Play examiner
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : prepRemaining > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                        Preparation time
                      </p>
                      <p className="mt-1 text-2xl font-black text-amber-900 tabular-nums">
                        {prepRemaining}s
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        Recording will unlock when preparation ends.
                      </p>
                    </div>
                    <div className="w-16 h-16">
                      {/* Simple circular countdown visual */}
                      <svg viewBox="0 0 36 36" className="-rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fde68a" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="3"
                          strokeDasharray={`${(prepRemaining / (speakingMeta?.prepSeconds ?? 60)) * 100} 100`}
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Notes area — only for Part 2 */}
                  {speakingMeta?.part === 2 && (
                    <div className="border border-[#d4cfc4] bg-white rounded-xl p-4">
                      <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-wider mb-2">
                        📝 Your notes (not submitted)
                      </p>
                      <textarea
                        rows={5}
                        placeholder="Jot down your ideas here. These notes are only for you and will not be saved..."
                        value={prepNotes}
                        onChange={(e) => setPrepNotes(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none resize-none text-slate-700"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Notes are temporary and will disappear after preparation ends.
                      </p>
                    </div>
                  )}
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
                    Recording in progress{speakingRemaining != null ? ` · ${speakingRemaining}s left` : "…"}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => onStartRecording(qId)}
                    disabled={speakingLockedByOtherRecording || speakingLockedByAi}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0c1a2e] text-white rounded-xl text-sm font-bold hover:bg-[#050d16] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mic size={15} /> Start Recording
                  </button>
                  <p className="text-xs text-slate-400 mt-2">
                    Ensure your microphone is enabled. Speak clearly when recording.
                    {speakingMeta?.maxSeconds ? ` Max ${speakingMeta.maxSeconds}s.` : ""}
                    {speakingLockedByOtherRecording ? " Another recording is in progress." : ""}
                    {speakingLockedByAi ? " Please wait for the examiner." : ""}
                  </p>
                </div>
              )}
              {liveMetrics && (
                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live metrics</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                    <div>Clarity: <strong>{liveMetrics.currentMetrics.clarity.toFixed(1)}/10</strong></div>
                    <div>Hesitation: <strong>{Math.round(liveMetrics.currentMetrics.hesitationRate)}/min</strong></div>
                    <div>Speaking rate: <strong>{Math.round(liveMetrics.currentMetrics.speakingRate)} WPM</strong></div>
                    <div>Audio quality: <strong>{Math.round(liveMetrics.currentMetrics.audioQuality)}%</strong></div>
                  </div>
                  {liveMetrics.warnings.length > 0 && (
                    <div className="text-xs text-amber-700">
                      {liveMetrics.warnings.map((w, i) => (
                        <div key={i}>• {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {speakingAnalysis && (speakingAnalysis.pronunciation || speakingAnalysis.hesitation) && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Audio analysis</p>
                  {speakingAnalysis.pronunciation && (
                    <p className="text-xs text-emerald-900">
                      Pronunciation: <strong>{speakingAnalysis.pronunciation.score}/9</strong> · Clarity {speakingAnalysis.pronunciation.clarity.toFixed(1)}/10
                    </p>
                  )}
                  {speakingAnalysis.hesitation && (
                    <p className="text-xs text-emerald-900">
                      Hesitation: <strong>{speakingAnalysis.hesitation.ratePerMinute.toFixed(1)}/min</strong> · Fluency {speakingAnalysis.hesitation.fluencyScore}/9
                    </p>
                  )}
                </div>
              )}
              {speakingAnalysis?.followUps && speakingAnalysis.followUps.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Examiner follow-ups</p>
                  <ul className="text-xs text-amber-900 list-disc pl-4 space-y-1">
                    {speakingAnalysis.followUps.map((f) => (
                      <li key={f.questionId}>{f.question}</li>
                    ))}
                  </ul>
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
