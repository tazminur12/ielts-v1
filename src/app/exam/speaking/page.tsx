"use client";

import { useEffect, useState } from "react";
import { useExam } from "@/components/exam/ExamContext";
import { Mic, Square, Volume2 } from "lucide-react";

export default function SpeakingPage() {
  const { startExam, currentQuestion, setCurrentQuestion } = useExam();
  const [isRecording, setIsRecording] = useState(false);
  const [questionText, setQuestionText] = useState("Can you tell me your full name?");

  useEffect(() => {
    startExam("speaking", 15 * 60, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const part = currentQuestion;
  const setPart = setCurrentQuestion;

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
       {/* Examiner View (Simulated) */}
       <div className="flex-1 flex items-center justify-center relative bg-black">
           <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-slate-700 mx-auto mb-4 flex items-center justify-center text-4xl">
                  👤
              </div>
              <h3 className="text-xl font-medium text-slate-300">Examiner</h3>
              <div className="mt-8 bg-slate-800 px-6 py-4 rounded-lg max-w-lg mx-auto shadow-lg border border-slate-700">
                  <p className="text-lg text-blue-300 mb-2 font-semibold">Examiner says:</p>
                  <p className="text-xl italic">&quot;{questionText}&quot;</p>
                  <button className="mt-4 text-sm text-slate-400 flex items-center justify-center gap-2 hover:text-white mx-auto">
                      <Volume2 size={16} /> Replay Audio
                  </button>
              </div>
           </div>
           
           <div className="absolute top-4 right-4 bg-slate-800/80 px-4 py-2 rounded text-sm font-medium">
               Part {part} of 3
           </div>
       </div>

       {/* Candidate Controls */}
       <div className="h-48 bg-slate-800 border-t border-slate-700 flex flex-col items-center justify-center p-6">
           <div className="mb-4 text-slate-300 font-medium">
               {isRecording ? "Recording..." : "Ready to record"}
           </div>

           <div className="relative">
              {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  </div>
              )}
              <button 
                onClick={toggleRecording}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                    ? "bg-white text-red-600 hover:bg-slate-200" 
                    : "bg-red-600 text-white hover:bg-red-500 shadow-lg hover:shadow-red-500/50"
                }`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                  {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
              </button>
           </div>
           
           {/* Visualizer Mock */}
           {isRecording && (
               <div className="mt-6 flex items-center justify-center gap-1 h-8">
                   {[...Array(20)].map((_, i) => (
                       <div 
                         key={i} 
                         className="w-1 bg-green-400 rounded-full animate-pulse"
                         style={{ 
                             height: `${(i % 5 + 1) * 15 + 20}%`,
                             animationDuration: `${0.5 + (i % 3) * 0.2}s`
                         }} 
                       />
                   ))}
               </div>
           )}

           <div className="absolute bottom-6 right-6 flex gap-4">
              <button 
                  onClick={() => {
                      setPart(Math.min(3, part + 1));
                      setQuestionText(part === 1 ? "Describe your hometown." : "How do you think transportation will change in the future?");
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium"
              >
                  Next Question &rarr;
              </button>
           </div>
       </div>
    </div>
  );
}
