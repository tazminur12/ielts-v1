"use client";

import { useState } from "react";
import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface ResumeModalProps {
  isOpen: boolean;
  onResume: () => void;
  onStartFresh: () => void;
  timeRemaining: number;
  lastSaved?: Date;
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ResumeModal({
  isOpen,
  onResume,
  onStartFresh,
  timeRemaining,
  lastSaved,
}: ResumeModalProps) {
  const [confirmFresh, setConfirmFresh] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0c1a2e]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#faf9f6] max-w-lg w-full border-2 border-[#c9a227] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#c9a227] px-5 py-3 flex items-center gap-3">
          <RefreshCw size={20} className="text-[#0c1a2e]" />
          <h2 className="text-[#0c1a2e] font-bold text-lg">Resume Unfinished Exam</h2>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
              <AlertCircle size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[#0c1a2e] font-bold">You have an unfinished exam</p>
              <p className="text-slate-600 text-sm">Pick up where you left off.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 border border-slate-200 p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-1">
                Time Remaining
              </p>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-1">
                Last Saved
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {lastSaved ? new Date(lastSaved).toLocaleTimeString() : "Recently"}
                </span>
              </div>
            </div>
          </div>

          {confirmFresh ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                <AlertCircle size={16} className="inline mr-2" />
                Are you sure you want to start fresh? This will <strong>permanently discard</strong> your existing progress.
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setConfirmFresh(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onStartFresh}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                >
                  Yes, Start Fresh
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setConfirmFresh(true)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 font-semibold hover:bg-white transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={onResume}
                className="flex-1 py-3 bg-[#0c1a2e] text-white font-bold hover:bg-[#050d16] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Resume Exam
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
