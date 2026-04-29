"use client";

import dynamic from "next/dynamic";

const Chatbot = dynamic(
  () => import("@/components/chatbot/Chatbot").then((m) => m.Chatbot),
  { ssr: false }
);

export function ClientChatbot() {
  return <Chatbot />;
}

