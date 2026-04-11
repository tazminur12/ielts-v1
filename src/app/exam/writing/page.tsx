"use client";

import { useEffect, useState } from "react";
import { useExam } from "@/components/exam/ExamContext";

export default function WritingPage() {
  const { startExam, currentQuestion, setCurrentQuestion } = useExam();
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");

  useEffect(() => {
    startExam("writing", 60 * 60, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const task = currentQuestion;
  const setTask = setCurrentQuestion;

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  };

  return (
    <div className="flex h-full flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center space-x-4">
          <button 
             onClick={() => setTask(1)}
             className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                 task === 1 ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
             }`}
          >
             Task 1
          </button>
          <button 
             onClick={() => setTask(2)}
             className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                 task === 2 ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
             }`}
          >
             Task 2
          </button>
       </div>

       <div className="flex flex-1 overflow-hidden">
          {/* Left: Prompt */}
          <div className="w-1/2 h-full overflow-y-auto p-8 border-r border-slate-300 bg-slate-50">
             {task === 1 ? (
                 <div>
                     <h3 className="text-xl font-bold mb-4 text-slate-800">Writing Task 1</h3>
                     <p className="mb-4 text-slate-700">
                         You should spend about 20 minutes on this task.
                     </p>
                     <div className="bg-white p-4 border border-slate-200 rounded mb-6">
                         <p className="font-medium mb-4">The chart below shows the number of men and women in further education in Britain in three periods and whether they were studying full-time or part-time.</p>
                         <div className="bg-slate-200 h-64 w-full flex items-center justify-center rounded text-slate-500">
                             [Chart Placeholder: Men vs Women in Education]
                         </div>
                         <p className="mt-4 font-medium">Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
                     </div>
                     <p className="text-sm text-slate-600">Write at least 150 words.</p>
                 </div>
             ) : (
                 <div>
                     <h3 className="text-xl font-bold mb-4 text-slate-800">Writing Task 2</h3>
                     <p className="mb-4 text-slate-700">
                         You should spend about 40 minutes on this task.
                     </p>
                     <div className="bg-white p-6 border border-slate-200 rounded mb-6 shadow-sm">
                         <p className="font-medium mb-4 italic text-lg text-slate-800">
                             &quot;Some people believe that unpaid community service should be a compulsory part of high school programmes (for example working for a charity, improving the neighbourhood or teaching sports to younger children).&quot;
                         </p>
                         <p className="font-medium">To what extent do you agree or disagree?</p>
                     </div>
                     <p className="text-sm text-slate-600">Write at least 250 words.</p>
                 </div>
             )}
          </div>

          {/* Right: Editor */}
          <div className="w-1/2 h-full flex flex-col bg-white">
             <div className="flex-1 p-6">
                <textarea
                   className="w-full h-full p-4 border border-slate-300 rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base leading-relaxed"
                   placeholder="Start typing your answer here..."
                   value={task === 1 ? text1 : text2}
                   onChange={(e) => task === 1 ? setText1(e.target.value) : setText2(e.target.value)}
                />
             </div>
             <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
                 <span className="font-semibold text-slate-600">Word Count: {countWords(task === 1 ? text1 : text2)}</span>
                 <span className="text-slate-500">
                    {task === 1 ? "Min: 150" : "Min: 250"}
                 </span>
             </div>
          </div>
       </div>
    </div>
  );
}
