"use client";

import type { ReactNode } from "react";
import { Headphones } from "lucide-react";
import { AudioPlayer } from "../AudioPlayer";
import type { Section } from "@/types/exam";

interface ListeningSectionProps {
  section: Section;
  children?: ReactNode;
}

/**
 * ListeningSection: Audio player + questions layout
 * Plays audio once only - mimics real IELTS listening test
 */
export default function ListeningSection({
  section,
  children,
}: ListeningSectionProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#e8e4dc]">
      <div className="max-w-3xl mx-auto p-5 space-y-5">
        {/* Audio Player Card */}
        {section.audioUrl && (
          <div className="bg-[#0c1a2e] border border-[#c9a227]/35 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-[#c9a227] flex items-center justify-center border border-[#e4c96a]/40">
                <Headphones size={16} className="text-[#0c1a2e]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227] mb-0.5">
                  Listening
                </p>
                <p className="text-white font-semibold text-sm">{section.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">Listen once only. Answer as you listen.</p>
              </div>
            </div>
            <AudioPlayer
              key={section._id}
              src={section.audioUrl}
              lockKey={`section:${section._id}`}
              singlePlay
            />
          </div>
        )}

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
