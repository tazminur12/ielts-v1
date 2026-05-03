"use client";

import { SessionProvider } from "next-auth/react";
import ClientSentryInit from "@/components/ClientSentryInit";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClientSentryInit />
      {children}
    </SessionProvider>
  );
}
