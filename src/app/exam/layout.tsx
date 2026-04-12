"use client";

import React from "react";
import { ExamProvider } from "@/components/exam/ExamContext";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { ExamFooter } from "@/components/exam/ExamFooter";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { usePathname } from "next/navigation";

/**
 * /exam/take — full-screen computer-delivered test (no marketing chrome).
 * /exam, /exam/results — hub pages with site nav.
 * Other /exam/* — legacy module shell with ExamHeader/Footer.
 */
export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTakeRoute = pathname.startsWith("/exam/take");
  const isHubRoute =
    pathname === "/exam" ||
    pathname === "/exam/" ||
    pathname.startsWith("/exam/results");

  return (
    <ExamProvider>
      {isTakeRoute ? (
        <div className="min-h-dvh bg-[#e6e2d9] text-slate-900 antialiased selection:bg-amber-200/80">
          {children}
        </div>
      ) : isHubRoute ? (
        <div className="flex flex-col min-h-screen bg-slate-50">
          <Navbar />
          <main className="flex-1 pt-20 flex flex-col">{children}</main>
          <Footer />
        </div>
      ) : (
        <div className="flex flex-col h-screen bg-[#faf9f6] overflow-hidden">
          <ExamHeader />
          <main className="flex-1 overflow-auto pb-32">{children}</main>
          <ExamFooter />
        </div>
      )}
    </ExamProvider>
  );
}
