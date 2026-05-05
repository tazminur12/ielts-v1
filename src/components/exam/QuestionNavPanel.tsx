"use client";

import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from "lucide-react";

interface QuestionNavPanelProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<string>;
  markedForReview: Set<number>;
  onQuestionSelect: (qNum: number) => void;
  onToggleReview: (qNum: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isCurrentQuestionSpeaking?: boolean;
  speakingDone?: boolean;
}

export default function QuestionNavPanel({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  markedForReview,
  onQuestionSelect,
  onToggleReview,
  onNext,
  onPrevious,
  isCurrentQuestionSpeaking = false,
  speakingDone = true,
}: QuestionNavPanelProps) {
  const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  const getStatusStyle = (qNum: number) => {
    const isCurrent = qNum === currentQuestion;
    const isAnswered = answeredQuestions.has(String(qNum));
    const isMarked = markedForReview.has(qNum);

    let baseStyle = "flex items-center justify-center text-[11px] font-bold rounded-full border-2 transition-colors ";
    
    if (isCurrent) {
      baseStyle += "w-10 h-10 sm:w-11 sm:h-10 ring-2 ring-[#c9a227] ring-offset-2 animate-pulse bg-[#c9a227] text-[#0c1a2e] border-[#c9a227]";
    } else if (isAnswered) {
      baseStyle += "w-10 h-10 sm:w-11 sm:h-10 bg-emerald-600 text-white border-emerald-600";
    } else if (isMarked) {
      baseStyle += "w-10 h-10 sm:w-11 sm:h-10 bg-amber-100 border-amber-400 text-amber-800";
    } else {
      baseStyle += "w-10 h-10 sm:w-11 sm:h-10 bg-white border-slate-300 text-slate-500";
    }
    
    return baseStyle;
  };

  return (
    <div className="bg-white border-t border-slate-200 px-3 py-2 shadow-[0_-4px_20px_rgba(12,26,46,0.08)]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-600" />
              <span className="text-slate-600">Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-400" />
              <span className="text-slate-600">Marked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white border border-slate-300" />
              <span className="text-slate-600">Unanswered</span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2">
            <button
              onClick={onPrevious}
              disabled={currentQuestion <= 1}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronLeft size={12} />
              Previous
            </button>
            <span className="text-[11px] text-slate-500 font-semibold tabular-nums">
              {currentQuestion}/{totalQuestions}
            </span>
            <button
              onClick={onNext}
              disabled={currentQuestion >= totalQuestions || (isCurrentQuestionSpeaking && !speakingDone)}
              title={isCurrentQuestionSpeaking && !speakingDone ? "Complete your recording before moving to the next question" : ""}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {questions.map((qNum) => {
            return (
              <div key={qNum} className="relative group">
                <button
                  onClick={() => onQuestionSelect(qNum)}
                  className={getStatusStyle(qNum)}
                >
                  {qNum}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReview(qNum);
                  }}
                  className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title={markedForReview.has(qNum) ? "Unmark for review" : "Mark for review"}
                >
                  {markedForReview.has(qNum) ? (
                    <BookmarkCheck size={11} className="text-amber-600" />
                  ) : (
                    <Bookmark size={11} className="text-slate-400" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
