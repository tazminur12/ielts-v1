"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Clock, AlertCircle, CheckCircle, Mic, MicOff,
  Loader2, ChevronRight, Volume2
} from "lucide-react";

// Types from page.tsx
type QuestionType =
  | "multiple_choice"
  | "true_false_not_given"
  | "fill_blank"
  | "matching"
  | "sentence_completion"
  | "short_answer"
  | "essay"
  | "speaking"
  | "matching_headings"
  | "summary_completion";

interface Question {
  _id: string;
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  speakingPrompt?: string;
  speakingDuration?: number;
  speakingAudioUrl?: string;
  imageUrl?: string;
  wordLimit?: number;
  marks: number;
  order: number;
}

interface QuestionGroup {
  _id: string;
  questionType: QuestionType;
  title?: string;
  instructions?: string;
  questionNumberStart: number;
  questionNumberEnd: number;
  matchingOptions?: string[];
  questions: Question[];
}

interface Section {
  _id: string;
  title: string;
  order: number;
  sectionType: "listening_part" | "reading_passage" | "writing_task" | "speaking_part";
  instructions?: string;
  audioUrl?: string;
  passageText?: string;
  passageImage?: string;
  timeLimit?: number;
  groups: QuestionGroup[];
}

interface SpeakingSequentialViewProps {
  sections: Section[];
  attemptId: string;
  answers: Record<string, string>;
  recording: Record<string, boolean>;
  recordingEndsAt: Record<string, number>;
  speakingDone: Record<string, boolean>;
  onStartRecording: (qId: string) => void;
  onStopRecording: (qId: string) => void;
  speakingMetaById: Record<string, { part: 1 | 2 | 3; maxSeconds: number; prepSeconds: number }>;
  isLiveInterview: boolean;
  aiSpeaking: boolean;
  liveTurns: Record<string, { userText: string; aiText: string; aiAudioUrl: string | null }>;
  speakingAnalysis: Record<string, any>;
  speakingLiveMetrics: Record<string, any>;
  uploadStatus: Record<string, 'idle' | 'uploading' | 'retrying' | 'failed' | 'saved'>;
  retryAttempt: Record<string, number>;
}

export default function SpeakingSequentialView({
  sections,
  attemptId,
  answers,
  recording,
  recordingEndsAt,
  speakingDone,
  onStartRecording,
  onStopRecording,
  speakingMetaById,
  isLiveInterview,
  aiSpeaking,
  liveTurns,
  speakingAnalysis,
  speakingLiveMetrics,
  uploadStatus,
  retryAttempt,
}: SpeakingSequentialViewProps) {
  // Extract all speaking questions, grouped by part
  const allQuestionsByPart = useMemo(() => {
    const parts: Array<{
      partNumber: 1 | 2 | 3;
      title: string;
      intro: string;
      questions: Question[];
    }> = [];

    sections.forEach((sec) => {
      if (sec.sectionType !== "speaking_part") return;
      const partNum = (Number((sec as any).partNumber || sec.order || 1) === 2 ? 2 : 
                       Number((sec as any).partNumber || sec.order || 1) === 3 ? 3 : 1) as 1 | 2 | 3;
      
      const partQuestions = sec.groups.flatMap(g => g.questions);
      
      const introText = partNum === 1 
        ? "Part 1 — Introduction & Interview. The examiner will ask you general questions. Listen carefully and answer naturally."
        : partNum === 2
        ? "Part 2 — Individual Long Turn. You will be given a topic card. You have 1 minute to prepare, then speak for 1-2 minutes."
        : "Part 3 — Two-Way Discussion. The examiner will ask further questions related to the Part 2 topic.";

      parts.push({
        partNumber: partNum,
        title: sec.title,
        intro: introText,
        questions: partQuestions,
      });
    });

    return parts.sort((a, b) => a.partNumber - b.partNumber);
  }, [sections]);

  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [partIntroShown, setPartIntroShown] = useState<Record<number, boolean>>({});
  const [prepNotes, setPrepNotes] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [autoPlayStarted, setAutoPlayStarted] = useState<Record<string, boolean>>({}); // Track if auto-play already happened for each question
  const [questionTextRevealed, setQuestionTextRevealed] = useState<Record<string, boolean>>({}); // Track if question text should be shown after voice plays

  const currentPart = allQuestionsByPart[currentPartIndex];
  const currentQuestion = currentPart?.questions[currentQuestionIndex];
  const isLastPart = currentPartIndex === allQuestionsByPart.length - 1;
  const isLastQuestionOfPart = currentQuestionIndex === (currentPart?.questions.length ?? 0) - 1;
  const isLastQuestionOverall = isLastPart && isLastQuestionOfPart;

  // Prep timer for part 2
  const prepEndAt = useMemo(() => {
    if (!currentQuestion) return null;
    if (currentPart?.partNumber !== 2) return null;
    if (speakingDone[currentQuestion._id]) return null;
    if (!attemptId) return null;

    const key = `speaking_prep:${attemptId}:${currentQuestion._id}`;
    let startedAt = 0;
    try {
      const raw = localStorage.getItem(key);
      startedAt = raw ? Number(raw) : 0;
    } catch {}
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      try {
        localStorage.setItem(key, String(startedAt));
      } catch {}
    }
    const meta = speakingMetaById[currentQuestion._id];
    return startedAt + (meta?.prepSeconds ?? 60) * 1000;
  }, [currentQuestion, currentPart?.partNumber, speakingDone, attemptId, speakingMetaById]);

  const prepRemaining =
    prepEndAt && now < prepEndAt ? Math.max(0, Math.ceil((prepEndAt - now) / 1000)) : 0;

  // Update current time for prep timer
  useState(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  });

  // Auto-play examiner voice and auto-start recording when question becomes active
  useEffect(() => {
    if (!currentQuestion || !partIntroShown[currentPart?.partNumber as number] || speakingDone[currentQuestion._id]) {
      return;
    }

    // Check if we already auto-played for this question
    if (autoPlayStarted[currentQuestion._id]) {
      return;
    }

    // Helper: Generate synthetic audio using Web Audio API (for testing when real audio not available)
    const generateSyntheticAudio = (durationSeconds: number = 8): Promise<HTMLAudioElement> => {
      return new Promise((resolve) => {
        try {
          const createAndPlayAudio = () => {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const duration = Math.max(3, Math.min(durationSeconds, 15));
            const audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
            const data = audioBuffer.getChannelData(0);
            
            // Generate a pleasant tone (silent for now - just duration)
            for (let i = 0; i < data.length; i++) {
              data[i] = 0; // Silent
            }
            
            return { audioContext, audioBuffer, duration };
          };
          
          // Create a mock audio element for compatibility
          const mockAudio = new Audio() as any;
          mockAudio.onended = null;
          mockAudio.play = () => {
            try {
              const { audioContext, audioBuffer, duration } = createAndPlayAudio();
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start(0);
              
              // Call onended callback after duration
              setTimeout(() => {
                if (mockAudio.onended) mockAudio.onended();
              }, duration * 1000);
            } catch (e) {
              console.warn("Failed to play synthetic audio", e);
              if (mockAudio.onended) mockAudio.onended();
            }
            return Promise.resolve();
          };
          
          resolve(mockAudio);
        } catch (err) {
          console.warn("Web Audio API not available, using silent fallback", err);
          // Fallback: simple duration timer
          const mockAudio = new Audio() as any;
          mockAudio.onended = null;
          mockAudio.play = () => {
            const duration = Math.max(3, Math.min(durationSeconds, 15));
            setTimeout(() => {
              if (mockAudio.onended) mockAudio.onended();
            }, duration * 1000);
            return Promise.resolve();
          };
          resolve(mockAudio);
        }
      });
    };

    // Only auto-play if examiner audio exists OR Part 1/3 (not Part 2 where student reads cue card)
    if (currentPart?.partNumber !== 2) {
      (async () => {
        let audio: HTMLAudioElement;
        
        if (currentQuestion.speakingAudioUrl) {
          // Use real audio URL if available
          audio = new Audio(currentQuestion.speakingAudioUrl);
        } else {
          // Generate synthetic audio for testing
          const duration = currentQuestion.speakingDuration || 8;
          audio = await generateSyntheticAudio(duration);
        }
        
        // When audio ends: reveal question text, then start recording
        audio.onended = () => {
          // Reveal question text
          setQuestionTextRevealed(prev => ({ ...prev, [currentQuestion._id]: true }));
          
          // Auto-start recording when audio finishes
          if (!recording[currentQuestion._id] && !speakingDone[currentQuestion._id]) {
            onStartRecording(currentQuestion._id);
          }
        };

        // Play the audio
        audio.play().catch((err) => console.error("Failed to auto-play examiner audio:", err));

        // Mark as auto-played
        setAutoPlayStarted(prev => ({ ...prev, [currentQuestion._id]: true }));
      })();
    } else if (currentPart?.partNumber === 2 && !recording[currentQuestion._id]) {
      // For Part 2 (cue card), show text immediately and auto-start recording after 1 second
      setQuestionTextRevealed(prev => ({ ...prev, [currentQuestion._id]: true }));
      
      // Give user 1 second to read the cue card
      const timer = setTimeout(() => {
        if (!recording[currentQuestion._id] && !speakingDone[currentQuestion._id]) {
          onStartRecording(currentQuestion._id);
          setAutoPlayStarted(prev => ({ ...prev, [currentQuestion._id]: true }));
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, currentPart?.partNumber, partIntroShown, speakingDone, recording, onStartRecording, autoPlayStarted]);

  if (!currentPart || !currentQuestion) {
    return null;
  }

  // Part intro screen
  if (!partIntroShown[currentPart.partNumber]) {
    return (
      <div className="h-full flex items-center justify-center bg-[#e8e4dc] p-6">
        <div className="bg-[#faf9f6] border border-[#d4cfc4] shadow-[0_4px_24px_rgba(12,26,46,0.08)] p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-[#c9a227] mx-auto mb-6 flex items-center justify-center border border-[#e4c96a]/40">
            <span className="text-[#0c1a2e] font-black text-lg tracking-tight">CD</span>
          </div>
          <h2 className="text-[#0c1a2e] font-bold text-xl mb-4">
            Part {currentPart.partNumber}
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed mb-8">
            {currentPart.intro}
          </p>
          <button
            onClick={() => setPartIntroShown(prev => ({ ...prev, [currentPart.partNumber]: true }))}
            className="px-10 py-3 bg-[#0c1a2e] text-white text-sm font-bold hover:bg-[#050d16] transition-colors border border-[#0c1a2e]"
          >
            Begin Part {currentPart.partNumber}
          </button>
        </div>
      </div>
    );
  }

  // Single question view
  const isRecording = recording[currentQuestion._id] ?? false;
  const isSpeakingDone = speakingDone[currentQuestion._id] ?? false;
  const qUploadStatus = uploadStatus[currentQuestion._id] ?? 'idle';
  const qRetryAttempt = retryAttempt[currentQuestion._id] ?? 0;
  const liveTurn = liveTurns[currentQuestion._id] ?? null;
  const qSpeakingAnalysis = speakingAnalysis[currentQuestion._id] ?? null;
  const qLiveMetrics = speakingLiveMetrics[currentQuestion._id] ?? null;
  const qMeta = speakingMetaById[currentQuestion._id];
  const speakingRemaining =
    recordingEndsAt[currentQuestion._id] && now < recordingEndsAt[currentQuestion._id] 
      ? Math.max(0, Math.ceil((recordingEndsAt[currentQuestion._id] - now) / 1000)) 
      : null;

  const handleNext = () => {
    if (isLastQuestionOfPart) {
      if (isLastPart) {
        // Finish speaking - nothing to do here, main component will handle
        return;
      } else {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      }
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const totalQuestions = allQuestionsByPart.reduce((sum, part) => sum + part.questions.length, 0);
  const questionsCompletedBefore = allQuestionsByPart
    .slice(0, currentPartIndex)
    .reduce((sum, part) => sum + part.questions.length, 0) + currentQuestionIndex;
  const progressPercent = ((questionsCompletedBefore + (isSpeakingDone ? 1 : 0)) / totalQuestions) * 100;

  return (
    <div className="h-full overflow-y-auto bg-[#e8e4dc]">
      <div className="max-w-3xl mx-auto p-5 space-y-5">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500 font-semibold">
            <span>Progress</span>
            <span>{questionsCompletedBefore + (isSpeakingDone ? 1 : 0)} of {totalQuestions}</span>
          </div>
          <div className="h-2 w-full bg-[#d4cfc4] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#c9a227] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Part & Question header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c9a227]">
            PART {currentPart.partNumber}
          </span>
          <span className="text-xs text-slate-500">
            Question {currentQuestionIndex + 1} of {currentPart.questions.length}
          </span>
        </div>

        {/* Question content */}
        <div className="space-y-5">
          {/* Listening placeholder for Part 1/3 with examiner audio */}
          {currentQuestion.speakingAudioUrl && currentPart.partNumber !== 2 && !questionTextRevealed[currentQuestion._id] && (
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex items-center gap-3 justify-center animate-pulse">
              <div className="w-5 h-5 rounded-full bg-blue-400"></div>
              <p className="text-sm font-semibold text-blue-700">Listening to examiner question...</p>
            </div>
          )}

          {/* Speaking prompt / cue card */}
          {(currentQuestion.speakingPrompt || currentQuestion.questionText) && (questionTextRevealed[currentQuestion._id] || currentPart.partNumber === 2) && (
            <div className={`bg-[#faf9f6] border border-[#d4cfc4] ${currentPart.partNumber === 2 ? 'border-l-[6px] border-l-[#c9a227]' : 'border-l-[3px] border-l-[#c9a227]'} p-4 animate-in fade-in duration-300`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#0c1a2e] uppercase tracking-[0.15em] mb-1.5">
                    {currentPart.partNumber === 2 ? 'Candidate cue card' : 'Question'}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentQuestion.speakingPrompt || currentQuestion.questionText}
                  </p>
                  {currentQuestion.speakingDuration && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock size={11} /> {currentQuestion.speakingDuration}s recommended
                    </p>
                  )}
                </div>
                {/* Examiner audio play button - show for Part 1/3 */}
                {currentPart.partNumber !== 2 && (
                  <button
                    onClick={() => {
                      if (currentQuestion.speakingAudioUrl) {
                        const a = new Audio(currentQuestion.speakingAudioUrl as string);
                        a.play().catch((err) => console.error("Failed to play examiner audio:", err));
                      }
                      // If no real audio, do nothing (synthetic audio only plays on auto-play at beginning)
                    }}
                    className="shrink-0 mt-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={currentQuestion.speakingAudioUrl ? "Listen to examiner read the question" : "No audio available yet"}
                    disabled={!currentQuestion.speakingAudioUrl}
                  >
                    <Volume2 size={14} className="text-blue-600" />
                    <span className="text-xs font-semibold text-blue-600">Listen</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Part 2 prep notes */}
          {currentPart.partNumber === 2 && prepRemaining > 0 && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Preparation time</p>
                <p className="mt-1 text-sm font-bold text-amber-900 tabular-nums">{prepRemaining}s</p>
              </div>
              <textarea
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                placeholder="Make notes here (not submitted, for your reference only)..."
                rows={6}
                className="w-full border border-[#d4cfc4] rounded-xl px-4 py-3 text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-[#0c1a2e] focus:border-[#0c1a2e] focus:outline-none resize-y transition-all bg-white"
              />
            </div>
          )}

          {/* Upload status */}
          {qUploadStatus !== 'idle' && !isSpeakingDone && (
            <div className="space-y-2">
              {qUploadStatus === 'uploading' && (
                <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
                  <Loader2 size={16} className="animate-spin" /> Uploading...
                </div>
              )}
              {qUploadStatus === 'retrying' && (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                  <AlertCircle size={16} /> Retrying ({qRetryAttempt}/3)...
                </div>
              )}
              {qUploadStatus === 'failed' && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  <AlertCircle size={16} /> Upload failed. Saved locally. Will retry when connection restores.
                </div>
              )}
              {qUploadStatus === 'saved' && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                  <CheckCircle size={16} /> Recording submitted
                </div>
              )}
            </div>
          )}

          {/* Speaking done state */}
          {isSpeakingDone ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                <CheckCircle size={16} /> Recording submitted successfully
              </div>

              {/* Playback of already recorded audio */}
              {answers[currentQuestion._id] && (
                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Recording</p>
                  <audio
                    controls
                    src={answers[currentQuestion._id]}
                    className="w-full h-8 rounded-lg"
                  />
                </div>
              )}

              {isLiveInterview && liveTurn && (
                <div className="border border-[#d4cfc4] bg-white px-4 py-3 space-y-3">
                  {liveTurn.userText && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">You</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{liveTurn.userText}</p>
                    </div>
                  )}
                  {liveTurn.aiText && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Examiner</p>
                      <p className="text-sm text-slate-800 leading-relaxed font-medium">{liveTurn.aiText}</p>
                      {liveTurn.aiAudioUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = new Audio(liveTurn.aiAudioUrl as string);
                            a.play().catch(() => {});
                          }}
                          className="mt-2 inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Volume2 size={14} /> Play examiner
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Next button */}
              <button
                onClick={handleNext}
                disabled={!isSpeakingDone}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isSpeakingDone
                    ? 'bg-[#0c1a2e] text-white hover:bg-[#050d16] border border-[#0c1a2e]'
                    : 'bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed'
                }`}
              >
                {isLastQuestionOverall ? 'Finish Speaking' : 'Next Question'}
                {!isLastQuestionOverall && <ChevronRight size={16} />}
              </button>
            </div>
          ) : prepRemaining > 0 && currentPart.partNumber === 2 ? (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
              <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Preparation time</p>
              <p className="mt-1 text-sm font-bold text-amber-900 tabular-nums">{prepRemaining}s</p>
              <p className="text-xs text-amber-800 mt-1">Recording will unlock when preparation ends.</p>
            </div>
          ) : isRecording ? (
            <div className="flex items-center gap-4 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
              <button
                onClick={() => onStopRecording(currentQuestion._id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
              >
                <MicOff size={15} /> Stop Recording
              </button>
              <div className="flex items-center gap-2 text-red-600 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                Recording in progress{speakingRemaining != null ? ` · ${speakingRemaining}s left` : "…"}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => onStartRecording(currentQuestion._id)}
                disabled={Object.values(recording).some(Boolean) || aiSpeaking}
                className="flex items-center gap-2 px-6 py-3 bg-[#0c1a2e] text-white rounded-xl text-sm font-bold hover:bg-[#050d16] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic size={15} /> Start Recording
              </button>
              <p className="text-xs text-slate-400 mt-2">
                Ensure your microphone is enabled. Speak clearly when recording.
                {qMeta?.maxSeconds ? ` Max ${qMeta.maxSeconds}s.` : ""}
                {Object.values(recording).some(Boolean) ? " Another recording is in progress." : ""}
                {aiSpeaking ? " Please wait for the examiner." : ""}
              </p>
            </div>
          )}

          {/* Live metrics */}
          {qLiveMetrics && (
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live metrics</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>Clarity: <strong>{qLiveMetrics.currentMetrics.clarity.toFixed(1)}/10</strong></div>
                <div>Hesitation: <strong>{Math.round(qLiveMetrics.currentMetrics.hesitationRate)}/min</strong></div>
                <div>Speaking rate: <strong>{Math.round(qLiveMetrics.currentMetrics.speakingRate)} WPM</strong></div>
                <div>Audio quality: <strong>{Math.round(qLiveMetrics.currentMetrics.audioQuality)}%</strong></div>
              </div>
              {qLiveMetrics.warnings.length > 0 && (
                <div className="text-xs text-amber-700">
                  {qLiveMetrics.warnings.map((w: string, i: number) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Speaking analysis */}
          {qSpeakingAnalysis && (qSpeakingAnalysis.pronunciation || qSpeakingAnalysis.hesitation) && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Audio analysis</p>
              {qSpeakingAnalysis.pronunciation && (
                <p className="text-xs text-emerald-900">
                  Pronunciation: <strong>{qSpeakingAnalysis.pronunciation.score}/9</strong> · Clarity {qSpeakingAnalysis.pronunciation.clarity ? qSpeakingAnalysis.pronunciation.clarity.toFixed(1) : 'N/A'}/10
                </p>
              )}
              {qSpeakingAnalysis.hesitation && (
                <p className="text-xs text-emerald-900">
                  Hesitation: <strong>{qSpeakingAnalysis.hesitation.ratePerMinute.toFixed(1)}/min</strong> · Fluency {qSpeakingAnalysis.hesitation.fluencyScore}/9
                </p>
              )}
            </div>
          )}

          {/* Follow ups */}
          {qSpeakingAnalysis?.followUps && qSpeakingAnalysis.followUps.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Examiner follow-ups</p>
              <ul className="text-xs text-amber-900 list-disc pl-4 space-y-1">
                {qSpeakingAnalysis.followUps.map((f: any, i: number) => (
                  <li key={f.questionId || i}>{f.question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
