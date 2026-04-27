"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage, type ChatMessageModel } from "./ChatMessage";

type ApiChatResponse =
  | { ok: true; message: { role: "assistant"; content: string } }
  | { ok: false; error: string };

const STORAGE_KEY = "ielts.chatbot.v1";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
      <span className="inline-flex h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse [animation-delay:120ms]" />
      <span className="inline-flex h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse [animation-delay:240ms]" />
      <span className="ml-1 font-medium">IELTS Assistant is typing…</span>
    </div>
  );
}

function defaultWelcome(): ChatMessageModel[] {
  return [
    {
      id: uid(),
      role: "assistant",
      content:
        "Hi! I’m your IELTS Assistant. Send your Writing Task 1/2, ask for speaking tips, vocabulary upgrades, or a quick band estimate.",
      createdAt: Date.now(),
    },
  ];
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageModel[]>(defaultWelcome);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const historyForApi = useMemo(
    () =>
      messages
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { messages?: ChatMessageModel[] };
      if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      const userMsg: ChatMessageModel = {
        id: uid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: historyForApi,
          }),
        });

        const data = (await res.json()) as ApiChatResponse;
        if (!res.ok || !data.ok) {
          const msg = !data.ok
            ? data.error
            : "Something went wrong. Please try again.";
          setError(msg);
          return;
        }

        const botMsg: ChatMessageModel = {
          id: uid(),
          role: "assistant",
          content: data.message.content,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [historyForApi]
  );

  const reset = useCallback(() => {
    const next = defaultWelcome();
    setMessages(next);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: next }));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-[92vw] sm:w-[420px] h-[70vh] sm:h-[560px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl shadow-slate-900/20"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 backdrop-blur flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shrink-0">
                  <Bot className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    IELTS Assistant
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Writing correction • Speaking tips • Vocabulary • Band estimate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="hidden sm:inline-flex text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[calc(70vh-124px)] sm:h-[calc(560px-124px)] overflow-y-auto px-3 py-3 bg-slate-50/60 dark:bg-slate-950"
            >
              <div className="space-y-2">
                {messages.map((m) => (
                  <ChatMessage key={m.id} role={m.role} content={m.content} />
                ))}

                {loading ? (
                  <div className="pt-1">
                    <TypingIndicator />
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100 px-3 py-2 text-xs">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Input */}
            <ChatInput disabled={loading} onSend={send} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating button */}
      <AnimatePresence>
        {!open ? (
          <motion.button
            key="fab"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => setOpen(true)}
            className="h-14 w-14 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center"
            aria-label="Open IELTS Assistant"
          >
            <Bot className="w-6 h-6" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

