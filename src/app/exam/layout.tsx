"use client";

import React from "react";
import { ExamProvider } from "@/components/exam/ExamContext";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { ExamFooter } from "@/components/exam/ExamFooter";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { usePathname } from "next/navigation";

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === '/exam' || pathname === '/exam/' || pathname.startsWith('/exam/take') || pathname.startsWith('/exam/results');

  return (
    <ExamProvider>
      {isDashboard ? (
        <div className="flex flex-col min-h-screen bg-slate-50">
          <Navbar />
          <main className="flex-1 pt-20 flex flex-col">
            {children}
          </main>
          <Footer />
        </div>
      ) : (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
          <ExamHeader />
          <main className="flex-1 overflow-auto pb-32">
            {children}
          </main>
          <ExamFooter />
        </div>
      )}
    </ExamProvider>
  );
}
