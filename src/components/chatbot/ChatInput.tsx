import { Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function ChatInput({
  disabled,
  onSend,
  placeholder = "Ask anything about IELTS…",
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  const canSend = useMemo(() => {
    const trimmed = text.trim();
    return !disabled && trimmed.length > 0;
  }, [disabled, text]);

  const sendNow = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [disabled, onSend, text]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 backdrop-blur px-3 py-2">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendNow();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="min-h-[42px] max-h-28 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />

        <button
          type="button"
          onClick={sendNow}
          disabled={!canSend}
          className="h-[42px] w-[42px] rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-1 text-[11px] text-slate-400">
        Press <span className="font-semibold">Enter</span> to send,{" "}
        <span className="font-semibold">Shift</span>+<span className="font-semibold">Enter</span>{" "}
        for a new line.
      </p>
    </div>
  );
}

