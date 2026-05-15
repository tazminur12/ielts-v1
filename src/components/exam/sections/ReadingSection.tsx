"use client";

import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import type { Section } from "@/types/exam";

interface ReadingSectionProps {
  section: Section;
  children?: ReactNode;
}

/**
 * ReadingSection: Split-pane layout component
 * Left side: Reading passage
 * Right side: Questions (passed as children)
 */
export default function ReadingSection({
  section,
  children,
}: ReadingSectionProps) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Passage side */}
      <div className="w-1/2 min-w-0 shrink-0 overflow-y-auto border-r border-[#d4cfc4] bg-[#faf9f6] shadow-[inset_-8px_0_24px_-12px_rgba(12,26,46,0.06)]">
        <div className="p-6 sm:p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[#d4cfc4]">
            <BookOpen size={14} className="text-[#c9a227]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a227]">
              Reading passage
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#0c1a2e] mb-4 leading-snug">
            {section.title}
          </h2>
          {section.passageImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.passageImage}
              alt="Passage illustration"
              className="w-full mb-5 border border-[#d4cfc4]"
            />
          )}
          <div className="text-slate-800 leading-[1.85] text-[15px] font-serif whitespace-pre-wrap selection:bg-amber-100">
            {section.passageText}
          </div>
        </div>
      </div>

      {/* Questions side */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[#e8e4dc]">
        <div className="p-4 sm:p-6 max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Questions
          </p>
          <div className="space-y-5">
            {section.instructions && (
              <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] px-4 py-3">
                <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-1.5">
                  Instructions to candidates
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{section.instructions}</p>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
