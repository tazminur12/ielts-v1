"use client";

import type {
  QuestionGroup,
  AnswerMap,
} from "@/types/exam";
import type {
  LiveMetricsSnapshot,
  PronunciationAnalysisResult,
  HesitationReport,
  FollowUpQuestion,
} from "@/lib/speakingEnhancementComplete";

interface QuestionGroupViewProps {
  group: QuestionGroup;
  attemptId: string | null;
  answers: AnswerMap;
  writingTexts: Record<string, string>;
  recording: Record<string, boolean>;
  recordingEndsAt: Record<string, number>;
  speakingDone: Record<string, boolean>;
  liveTurns: Record<string, { userText: string; aiText: string; aiAudioUrl: string | null }>;
  onAnswer: (qId: string, val: string, qType: string) => void;
  onWritingChange: (qId: string, text: string) => void;
  onWritingBlur: (qId: string) => void;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  mode: string;
  speakingMetaById: Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }>;
  isAnyRecording: boolean;
  displayNumberById: Map<string, number>;
  isLiveInterview: boolean;
  aiSpeaking: boolean;
  aiTextTyping: Record<string, string>;
  speakingAnalysis: Record<string, {
    pronunciation?: PronunciationAnalysisResult;
    hesitation?: HesitationReport;
    followUps?: FollowUpQuestion[];
  }>;
  speakingLiveMetrics: Record<string, LiveMetricsSnapshot | null>;
  forceSpeaking: boolean;
  uploadStatus: Record<string, 'idle' | 'uploading' | 'retrying' | 'failed' | 'saved'>;
  retryAttempt: Record<string, number>;
  QuestionViewComponent: React.ComponentType<any>;
}

export default function QuestionGroupView({
  group,
  attemptId,
  answers,
  writingTexts,
  recording,
  recordingEndsAt,
  speakingDone,
  liveTurns,
  onAnswer,
  onWritingChange,
  onWritingBlur,
  onStartRecording,
  onStopRecording,
  mode,
  speakingMetaById,
  isAnyRecording,
  displayNumberById,
  isLiveInterview,
  aiSpeaking,
  aiTextTyping,
  speakingAnalysis,
  speakingLiveMetrics,
  forceSpeaking,
  uploadStatus,
  retryAttempt,
  QuestionViewComponent,
}: QuestionGroupViewProps) {
  const groupNumbers = group.questions
    .map((q) => displayNumberById.get(String(q._id)) || 0)
    .filter((n) => n > 0);
  const groupStart = groupNumbers.length ? Math.min(...groupNumbers) : group.questionNumberStart;
  const groupEnd = groupNumbers.length ? Math.max(...groupNumbers) : group.questionNumberEnd;
  const groupTypeLabel = forceSpeaking ? "speaking" : group.questionType;

  return (
    <div className="bg-[#faf9f6] border border-[#d4cfc4] shadow-[0_1px_3px_rgba(12,26,46,0.06)] overflow-hidden">
      <div className="bg-[#0c1a2e] text-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c9a227]">
            Questions {groupStart}–{groupEnd}
          </span>
          {group.title && (
            <span className="text-xs text-slate-300 font-medium truncate">
              · {group.title}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider border border-white/15 px-2 py-0.5">
          {groupTypeLabel.replace(/_/g, " ")}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {group.instructions && (
          <div className="border border-[#d4cfc4] bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed">
            <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-wide mb-1">
              Task instructions
            </p>
            {group.instructions}
          </div>
        )}

        {/* Matching options legend */}
        {(group.questionType === "matching" || group.questionType === "matching_headings") &&
          group.matchingOptions && group.matchingOptions.length > 0 && (
          <div className="bg-[#faf9f6] border border-[#d4cfc4] border-l-[3px] border-l-[#c9a227] p-4">
            <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-3">
              List of options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.matchingOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="shrink-0 w-6 h-6 bg-[#0c1a2e] text-white flex items-center justify-center text-xs font-bold border border-[#c9a227]/30">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-3">
          {group.questions.map((q) => (
            <QuestionViewComponent
              key={q._id}
              question={q}
              displayNumber={displayNumberById.get(String(q._id)) || q.questionNumber}
              answer={answers[q._id] ?? ""}
              writingText={writingTexts[q._id] ?? ""}
              isRecording={recording[q._id] ?? false}
              recordingEndsAt={recordingEndsAt[q._id] ?? null}
              speakingDone={speakingDone[q._id] ?? false}
              liveTurn={liveTurns[q._id] ?? null}
              forceSpeaking={forceSpeaking}
              matchingOptions={group.matchingOptions}
              onAnswer={onAnswer}
              onWritingChange={onWritingChange}
              onWritingBlur={onWritingBlur}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              mode={mode}
              attemptId={attemptId}
              speakingMeta={speakingMetaById[q._id] ?? null}
              isAnyRecording={isAnyRecording}
              isLiveInterview={isLiveInterview}
              aiSpeaking={aiSpeaking}
              aiTextTyping={aiTextTyping[q._id] ?? ""}
              speakingAnalysis={speakingAnalysis[q._id] ?? null}
              liveMetrics={speakingLiveMetrics[q._id] ?? null}
              uploadStatus={uploadStatus[q._id] ?? 'idle'}
              retryAttempt={retryAttempt[q._id] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
