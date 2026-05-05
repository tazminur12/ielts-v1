"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Play, CheckCircle2, AlertCircle } from "lucide-react";

export interface SpeakingResultCardProps {
  questionId?: string;
  questionNumber: number;
  questionText: string;
  partNumber: 1 | 2 | 3;
  evaluation: {
    fluencyCoherence: { bandScore: number; feedback: string; tips: string[] };
    lexicalResource: { bandScore: number; feedback: string; tips: string[] };
    grammaticalRange: { bandScore: number; feedback: string; tips: string[] };
    pronunciation: { bandScore: number; feedback: string; tips: string[] };
    overallBand: number;
    generalFeedback: string;
    strengths: string[];
    weaknesses: string[];
  };
  transcript?: string;
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

function getBandColor(band: number): {
  bg: string;
  border: string;
  text: string;
  pill: string;
} {
  if (band >= 7) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      pill: "bg-emerald-100 text-emerald-700 border-emerald-300",
    };
  } else if (band >= 5) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      pill: "bg-amber-100 text-amber-700 border-amber-300",
    };
  } else {
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      pill: "bg-red-100 text-red-700 border-red-300",
    };
  }
}

function getProgressColor(band: number): string {
  if (band >= 7) return "bg-emerald-500";
  if (band >= 5) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Criterion Score Bar ──────────────────────────────────────────────────────

function CriterionBar({
  label,
  bandScore,
  feedback,
  tips,
}: {
  label: string;
  bandScore: number;
  feedback: string;
  tips: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pct = (bandScore / 9) * 100;
  const color = getProgressColor(bandScore);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <span className="text-lg font-bold text-slate-900">{bandScore}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-slate-400 mt-1" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 mt-1" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
          {feedback && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Feedback
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{feedback}</p>
            </div>
          )}

          {tips && tips.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Tips to Improve
              </p>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                    <span className="shrink-0 text-amber-600 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SpeakingResultCard({
  questionNumber,
  questionText,
  partNumber,
  evaluation,
  transcript,
}: SpeakingResultCardProps) {
  const [expandedSection, setExpandedSection] = useState<
    "criteria" | "transcript" | null
  >(null);
  const colors = getBandColor(evaluation.overallBand);
  const partLabel = `Part ${partNumber}`;

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden shadow-sm`}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors.pill}`}>
                {partLabel}
              </span>
              <span className="text-xs text-slate-500 font-medium">Question {questionNumber}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 line-clamp-2">
              {questionText}
            </p>
          </div>

          {/* ── Overall Band Score ──────────────────────────────────────────── */}
          <div className="shrink-0 text-center">
            <div className={`text-3xl font-black ${colors.text}`}>
              {evaluation.overallBand}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">Band</div>
          </div>
        </div>
      </div>

      {/* ── General Feedback ────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-700 leading-relaxed">
          {evaluation.generalFeedback}
        </p>
      </div>

      {/* ── Strengths & Weaknesses ──────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-4 border-b border-slate-200">
        {/* Strengths */}
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Strengths
              </span>
            </div>
            <ul className="space-y-1.5">
              {evaluation.strengths.map((strength, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="shrink-0 text-emerald-500 font-bold">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <AlertCircle size={15} className="text-amber-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Areas to Improve
              </span>
            </div>
            <ul className="space-y-1.5">
              {evaluation.weaknesses.map((weakness, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="shrink-0 text-amber-500 font-bold">→</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Criterion Scores ────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === "criteria" ? null : "criteria")
          }
          className="w-full flex items-center justify-between gap-3 mb-3 hover:text-slate-700 transition-colors"
        >
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Detailed Criteria Breakdown
          </span>
          {expandedSection === "criteria" ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {expandedSection === "criteria" && (
          <div className="space-y-2.5">
            <CriterionBar
              label="Fluency and Coherence"
              bandScore={evaluation.fluencyCoherence.bandScore}
              feedback={evaluation.fluencyCoherence.feedback}
              tips={evaluation.fluencyCoherence.tips}
            />
            <CriterionBar
              label="Lexical Resource"
              bandScore={evaluation.lexicalResource.bandScore}
              feedback={evaluation.lexicalResource.feedback}
              tips={evaluation.lexicalResource.tips}
            />
            <CriterionBar
              label="Grammatical Range & Accuracy"
              bandScore={evaluation.grammaticalRange.bandScore}
              feedback={evaluation.grammaticalRange.feedback}
              tips={evaluation.grammaticalRange.tips}
            />
            <CriterionBar
              label="Pronunciation"
              bandScore={evaluation.pronunciation.bandScore}
              feedback={evaluation.pronunciation.feedback}
              tips={evaluation.pronunciation.tips}
            />
          </div>
        )}
      </div>

      {/* ── Audio & Transcript ──────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-3 border-t border-slate-200 bg-slate-50">
        {/* Transcript */}
        {transcript && (
          <div>
            <button
              onClick={() =>
                setExpandedSection(expandedSection === "transcript" ? null : "transcript")
              }
              className="flex items-center justify-between gap-3 w-full mb-2.5 hover:text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Play size={14} className="text-slate-600" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Transcript
                </span>
              </div>
              {expandedSection === "transcript" ? (
                <ChevronUp size={14} className="text-slate-400" />
              ) : (
                <ChevronDown size={14} className="text-slate-400" />
              )}
            </button>

            {expandedSection === "transcript" && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  {transcript}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
