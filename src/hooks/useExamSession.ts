"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ExamSession {
  testId: string;
  attemptId: string;
  answers: Record<string, string | string[]>;
  lastSaved: Date;
  timeRemaining: number;
}

const LOCAL_STORAGE_KEY = "ielts_exam_session";
const LOCAL_SAVE_INTERVAL = 30 * 1000; // 30 seconds
const SERVER_SAVE_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useExamSession(
  testId: string | null,
  attemptId: string | null,
  initialAnswers: Record<string, string>,
  initialTimeRemaining: number
) {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showToast, setShowToast] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [pendingLocalAnswers, setPendingLocalAnswers] = useState<Record<string, string | string[]>>({});
  const [pendingTime, setPendingTime] = useState<number | null>(null);

  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const serverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or load session
  useEffect(() => {
    if (!testId || !attemptId) {
      queueMicrotask(() => setSession(null));
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ExamSession;
        if (parsed.testId === testId && parsed.attemptId === attemptId) {
          queueMicrotask(() => setResumeModalOpen(true));
          queueMicrotask(() => setPendingLocalAnswers(parsed.answers));
          queueMicrotask(() => setPendingTime(parsed.timeRemaining));
          return;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    // No stored session or different test, create new
    const newSession: ExamSession = {
      testId,
      attemptId,
      answers: initialAnswers,
      lastSaved: new Date(),
      timeRemaining: initialTimeRemaining,
    };
    queueMicrotask(() => setSession(newSession));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSession));
  }, [testId, attemptId, initialAnswers, initialTimeRemaining]);

  // Sync pending answers when coming back online
  const syncPendingAnswers = useCallback(async () => {
    if (!session || !isOnline) return;
    try {
      await fetch("/api/exam/autosave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: session.attemptId,
          answers: session.answers,
          timeRemaining: session.timeRemaining,
        }),
      });
    } catch {
      // Failed to sync, will try again later
    }
  }, [session, isOnline]);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(false);
      syncPendingAnswers();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingAnswers]);

  // Save to localStorage
  const saveToLocal = useCallback(() => {
    if (!session) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  // Save to server
  const saveToServer = useCallback(async () => {
    if (!session || !isOnline) return;
    try {
      await fetch("/api/exam/autosave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: session.attemptId,
          answers: session.answers,
          timeRemaining: session.timeRemaining,
        }),
      });
      setSession((prev) => prev ? { ...prev, lastSaved: new Date() } : null);
    } catch {
      // Server save failed, continue with local only
    }
  }, [session, isOnline]);

  // Setup periodic saves
  useEffect(() => {
    if (!session) return;

    localTimerRef.current = setInterval(saveToLocal, LOCAL_SAVE_INTERVAL);
    serverTimerRef.current = setInterval(saveToServer, SERVER_SAVE_INTERVAL);

    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
      if (serverTimerRef.current) clearInterval(serverTimerRef.current);
    };
  }, [session, saveToLocal, saveToServer]);

  // Update answers
  const updateAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        answers: { ...prev.answers, [questionId]: answer },
        lastSaved: new Date(),
      };
      saveToLocal();
      return updated;
    });
  }, [saveToLocal]);

  // Update time
  const updateTime = useCallback((time: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, timeRemaining: time };
    });
  }, []);

  // Resume exam
  const resumeExam = useCallback(() => {
    if (!testId || !attemptId) return;
    setSession({
      testId,
      attemptId,
      answers: pendingLocalAnswers,
      lastSaved: new Date(),
      timeRemaining: pendingTime ?? initialTimeRemaining,
    });
    setPendingLocalAnswers({});
    setPendingTime(null);
    setResumeModalOpen(false);
  }, [testId, attemptId, pendingLocalAnswers, pendingTime, initialTimeRemaining]);

  // Start fresh
  const startFresh = useCallback(() => {
    if (!testId || !attemptId) return;
    const newSession: ExamSession = {
      testId,
      attemptId,
      answers: initialAnswers,
      lastSaved: new Date(),
      timeRemaining: initialTimeRemaining,
    };
    setSession(newSession);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSession));
    setPendingLocalAnswers({});
    setPendingTime(null);
    setResumeModalOpen(false);
  }, [testId, attemptId, initialAnswers, initialTimeRemaining]);

  // Clear session (when exam ends)
  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  return {
    session,
    isOnline,
    showToast,
    resumeModalOpen,
    pendingLocalAnswers,
    pendingTime,
    updateAnswer,
    updateTime,
    resumeExam,
    startFresh,
    clearSession,
  };
}
