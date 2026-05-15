"use client";

import type { ReactNode } from "react";
import { PenLine } from "lucide-react";
import type { Section } from "@/types/exam";

interface WritingSectionProps {
  section: Section;
  children?: ReactNode;
}

/**
 * WritingSection: Essay writing tasks
 * Displays writing prompts and textarea with word count tracking
 */
export default function WritingSection({
  section,
  children,
}: WritingSectionProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#e8e4dc]">
      <div className="max-w-4xl mx-auto p-5 space-y-5">
        {/* Header */}
        <div className="border-b border-[#d4cfc4] pb-3">
          <div className="flex items-center gap-2 mb-2">
            <PenLine size={16} className="text-[#c9a227]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227]">Writing</p>
          </div>
          <h2 className="text-lg font-bold text-[#0c1a2e] leading-snug">{section.title}</h2>
        </div>

        {/* Instructions */}
        {section.instructions && (
          <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] px-4 py-3">
            <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-1.5">
              Instructions to candidates
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{section.instructions}</p>
          </div>
        )}

        {/* Question Groups */}
        <div className="space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
