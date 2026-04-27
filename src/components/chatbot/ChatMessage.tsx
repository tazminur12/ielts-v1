import type { ReactNode } from "react";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageModel = {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: number;
};

function Bubble({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "user" | "assistant";
}) {
  const base =
    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words";

  if (variant === "user") {
    return (
      <div
        className={`${base} bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${base} bg-white text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700`}
    >
      {children}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
}: Pick<ChatMessageModel, "role" | "content">) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Bubble variant={isUser ? "user" : "assistant"}>{content}</Bubble>
    </div>
  );
}

