"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Mic, MicOff, Timer } from "lucide-react";

export type SpeakingQuestion = {
  _id: string;
  questionText: string;
  speakingPrompt?: string;
  speakingDuration?: number;
};

export type SpeakingPart = {
  partNumber: 1 | 2 | 3;
  title?: string;
  questions: SpeakingQuestion[];
  durationSeconds?: number;
  prepSeconds?: number;
  speakingSeconds?: number;
};

type Stage = "idle" | "prep" | "recording" | "uploading" | "done";

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(t)) {
      return t;
    }
  }
  return "";
}

export default function SpeakingTestInterface(props: {
  attemptId: string;
  parts: SpeakingPart[];
  onComplete?: () => void;
}) {
  const { attemptId, parts, onComplete } = props;

  const [stage, setStage] = useState<Stage>("idle");
  const [partIndex, setPartIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [micReady, setMicReady] = useState<boolean | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);

  const currentPart = parts[partIndex];
  const currentQuestion = currentPart?.questions?.[questionIndex];

  const partLabel = useMemo(() => {
    if (!currentPart) return "";
    return currentPart.title || `Part ${currentPart.partNumber}`;
  }, [currentPart]);

  const computedQuestionSeconds = useMemo(() => {
    if (!currentPart || !currentQuestion) return 0;
    if (currentPart.partNumber === 2) return currentPart.speakingSeconds ?? 120;
    if (typeof currentQuestion.speakingDuration === "number" && currentQuestion.speakingDuration > 0) {
      return currentQuestion.speakingDuration;
    }
    if (typeof currentPart.durationSeconds === "number" && currentPart.durationSeconds > 0) {
      const n = Math.max(1, currentPart.questions.length || 1);
      return Math.max(30, Math.floor(currentPart.durationSeconds / n));
    }
    return 60;
  }, [currentPart, currentQuestion]);

  const prepSeconds = useMemo(() => {
    if (!currentPart) return 0;
    return currentPart.partNumber === 2 ? currentPart.prepSeconds ?? 120 : 0;
  }, [currentPart]);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(
    (seconds: number) => {
      stopTick();
      setTimeLeft(seconds);
      tickRef.current = window.setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1));
      }, 1000);
    },
    [stopTick]
  );

  useEffect(() => {
    return () => {
      stopTick();
      try {
        recorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopTick]);

  const ensureMic = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Microphone is not supported in this browser.");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Recording is not supported in this browser.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      return stream;
    } catch (e: any) {
      setMicReady(false);
      throw e;
    }
  }, []);

  const advance = useCallback(() => {
    if (!currentPart) return;

    const isLastQuestion = questionIndex >= currentPart.questions.length - 1;
    if (!isLastQuestion) {
      setQuestionIndex((q) => q + 1);
      return;
    }

    const isLastPart = partIndex >= parts.length - 1;
    if (!isLastPart) {
      setPartIndex((p) => p + 1);
      return;
    }

    setStage("done");
    stopTick();
    onComplete?.();
  }, [currentPart, onComplete, partIndex, parts.length, questionIndex, stopTick]);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!currentPart || !currentQuestion) return;
      setError("");
      setSuccess("");

      const file = new File([blob], `speaking-part${currentPart.partNumber}-${currentQuestion._id}.webm`, {
        type: blob.type || "audio/webm",
      });

      const fd = new FormData();
      fd.append("attemptId", attemptId);
      fd.append("partNumber", String(currentPart.partNumber));
      fd.append("questionId", currentQuestion._id);
      fd.append("audio", file);

      try {
        const res = await fetch("/api/speaking/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to upload audio");
        }
        setSuccess("Audio uploaded");
        setStage("idle");
        if (currentPart.partNumber !== 2) {
          startTick(computedQuestionSeconds);
        }
        advance();
      } catch (e: any) {
        setError(e?.message || "Failed to upload audio");
        setStage("idle");
        if (currentPart.partNumber !== 2) {
          startTick(computedQuestionSeconds);
        }
      }
    },
    [advance, attemptId, computedQuestionSeconds, currentPart, currentQuestion, startTick]
  );

  const startRecording = useCallback(async () => {
    const stream = await ensureMic();
    setMicReady(true);

    const mimeType = pickMimeType();
    chunksRef.current = [];

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    recorderRef.current = recorder;

    recorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      chunksRef.current = [];
      await uploadBlob(blob);
    };

    recorder.start();
  }, [ensureMic, uploadBlob]);

  const stopRecording = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        setStage("uploading");
        stopTick();
        recorderRef.current.stop();
        return;
      }
    } catch (e: any) {
      setError(e?.message || "Failed to stop recording");
    }
    advance();
  }, [advance, stopTick]);

  const beginRecordingPhase = useCallback(async () => {
    if (!currentPart || !currentQuestion) return;
    setError("");
    try {
      await startRecording();
      setStage("recording");
      startTick(computedQuestionSeconds);
    } catch (e: any) {
      setError(e?.message || "Failed to start recording");
      setStage("idle");
    }
  }, [computedQuestionSeconds, currentPart, currentQuestion, startRecording, startTick]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    if (stage === "prep") {
      beginRecordingPhase();
    } else if (stage === "recording") {
      stopRecording();
    } else if (stage === "idle" && currentPart?.partNumber !== 2) {
      advance();
    }
  }, [advance, beginRecordingPhase, currentPart?.partNumber, stage, stopRecording, timeLeft]);

  useEffect(() => {
    setQuestionIndex(0);
  }, [partIndex]);

  useEffect(() => {
    if (!currentPart || !currentQuestion) return;
    setError("");
    setSuccess("");
    if (currentPart.partNumber === 2) {
      setStage("prep");
      startTick(prepSeconds);
    } else {
      setStage("idle");
      startTick(computedQuestionSeconds);
    }
  }, [computedQuestionSeconds, currentPart, currentQuestion, prepSeconds, startTick]);

  const canStartRecording =
    stage === "idle" && currentPart?.partNumber !== 2 && currentQuestion && timeLeft > 0;

  const showPrep = stage === "prep" && currentPart?.partNumber === 2;
  const showRecording = stage === "recording";
  const showUploading = stage === "uploading";

  if (!currentPart || !currentQuestion) {
    return (
      <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-6">
        <p className="text-sm text-slate-600 font-medium">No speaking questions found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{partLabel}</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {currentPart.partNumber === 2 ? "Cue card" : "Question"}
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <Timer className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-extrabold text-slate-800 tabular-nums">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
            <div>
              <p className="text-sm font-extrabold text-rose-800">Recording error</p>
              <p className="text-sm font-medium text-rose-700 mt-1">{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-sm font-extrabold text-emerald-800">Success</p>
              <p className="text-sm font-medium text-emerald-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {currentPart.partNumber === 2 ? "Candidate cue card" : "Examiner asks"}
          </p>
          <p className="mt-2 text-sm text-slate-800 font-semibold whitespace-pre-wrap">
            {currentQuestion.speakingPrompt || currentQuestion.questionText}
          </p>
        </div>

        {showPrep && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-extrabold text-amber-900">Preparation time</p>
            <p className="text-sm font-medium text-amber-800 mt-1">
              Use the remaining time to plan. Recording starts automatically when the timer ends.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {canStartRecording && (
            <button
              type="button"
              onClick={beginRecordingPhase}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/10"
            >
              <Mic className="w-4 h-4" />
              Start recording
            </button>
          )}

          {showRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 text-white font-extrabold text-sm hover:bg-rose-700 shadow-lg shadow-rose-600/10"
            >
              <MicOff className="w-4 h-4" />
              Stop recording
            </button>
          )}

          {showUploading && (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Uploading…</p>
            </div>
          )}

          {micReady === false && (
            <p className="text-sm text-rose-700 font-semibold">
              Microphone permission denied.
            </p>
          )}
        </div>

        {showRecording && (
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Recording</p>
            <div className="mt-3 flex items-end gap-1 h-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-emerald-500 animate-pulse"
                  style={{
                    height: `${20 + (i % 7) * 8}%`,
                    animationDuration: `${0.45 + (i % 4) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Part {currentPart.partNumber} · Question {questionIndex + 1}/{currentPart.questions.length}
          </span>
          {stage === "done" && <span className="text-emerald-700 font-extrabold">Completed</span>}
        </div>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
