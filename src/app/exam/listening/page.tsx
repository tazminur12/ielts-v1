"use client";

import { useEffect, useState } from "react";
import { useExam } from "@/components/exam/ExamContext";
import { AudioPlayer } from "@/components/exam/AudioPlayer";

export default function ListeningPage() {
  const { startExam, currentQuestion, setCurrentQuestion } = useExam();
  const [section, setSection] = useState(1);

  useEffect(() => {
    startExam("listening", 30 * 60, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If currentQuestion > 10, section changes in a real app.
    // Let's do a basic mapping for mock: 1-10 -> S1, 11-20 -> S2, etc.
    const newSection = Math.ceil(currentQuestion / 10);
    if (newSection !== section && newSection <= 4) {
      setSection(newSection);
    }

    setTimeout(() => {
      const el = document.getElementById(`question-${currentQuestion}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10">
          <AudioPlayer src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />
          
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
               <button
                 key={s}
                 onClick={() => setSection(s)}
                 className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                    section === s 
                    ? "bg-slate-100 text-blue-700 border-b-2 border-blue-600" 
                    : "text-slate-600 hover:bg-slate-50"
                 }`}
               >
                 Section {s}
               </button>
            ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full pb-32">
           <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 min-h-[500px]">
               <h2 className="text-2xl font-bold mb-6 text-slate-800">Section {section}</h2>
               <p className="mb-6 text-slate-600 italic">
                  Listen to the audio and answer questions 1-10.
               </p>

               <div className="space-y-8">
                  {/* Mock Form Completion */}
                  <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-800 border-b pb-2">Accommodation Form</h3>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                          <div className="grid grid-cols-[1fr,2fr] gap-4 items-center border-b border-dashed border-slate-200 pb-2">
                              <span className="font-semibold text-slate-700">Name:</span>
                              <span className="text-slate-900">Robert Goddard</span>
                          </div>
                           <div id={`question-${(section - 1) * 10 + 1}`} className={`grid grid-cols-[1fr,2fr] gap-4 items-center border-b border-dashed border-slate-200 p-2 transition-colors ${currentQuestion === (section - 1) * 10 + 1 ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentQuestion((section - 1) * 10 + 1)}>
                              <span className="font-semibold text-slate-700">Present address:</span>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold">{(section - 1) * 10 + 1}.</span>
                                  <input type="text" className="border border-slate-300 rounded px-2 py-1 w-full max-w-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Answer here" onFocus={() => setCurrentQuestion((section - 1) * 10 + 1)} />
                              </div>
                          </div>
                          <div id={`question-${(section - 1) * 10 + 2}`} className={`grid grid-cols-[1fr,2fr] gap-4 items-center border-b border-dashed border-slate-200 p-2 transition-colors ${currentQuestion === (section - 1) * 10 + 2 ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentQuestion((section - 1) * 10 + 2)}>
                              <span className="font-semibold text-slate-700">Length of stay:</span>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold">{(section - 1) * 10 + 2}.</span>
                                  <input type="text" className="border border-slate-300 rounded px-2 py-1 w-full max-w-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Answer here" onFocus={() => setCurrentQuestion((section - 1) * 10 + 2)} />
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Mock Multiple Choice */}
                  <div>
                      <h3 className="text-lg font-semibold mb-4 text-blue-800 border-b pb-2">Choose the correct letter, A, B or C.</h3>
                      <div className="space-y-4">
                          <div id={`question-${(section - 1) * 10 + 3}`} className={`space-y-2 p-3 transition-colors ${currentQuestion === (section - 1) * 10 + 3 ? 'bg-blue-50/50' : ''}`} onClick={() => setCurrentQuestion((section - 1) * 10 + 3)}>
                              <div className="flex gap-2 font-semibold text-slate-800">
                                  <span>{(section - 1) * 10 + 3}.</span>
                                  <p>What does the student say about the course?</p>
                              </div>
                              <div className="pl-6 space-y-2">
                                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                                      <input type="radio" name="q3" className="w-4 h-4 text-blue-600" onFocus={() => setCurrentQuestion((section - 1) * 10 + 3)} />
                                      <span>A. It is too difficult.</span>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                                      <input type="radio" name="q3" className="w-4 h-4 text-blue-600" onFocus={() => setCurrentQuestion((section - 1) * 10 + 3)} />
                                      <span>B. It is interesting.</span>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                                      <input type="radio" name="q3" className="w-4 h-4 text-blue-600" onFocus={() => setCurrentQuestion((section - 1) * 10 + 3)} />
                                      <span>C. It is boring.</span>
                                  </label>
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
           </div>
       </div>
    </div>
  );
}
