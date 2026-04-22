"use client";

import { useExam } from "./ExamContext";

export const ExamFooter = () => {
  const { 
    isExamActive, 
    currentQuestion, 
    setCurrentQuestion, 
    reviewList, 
    toggleReview, 
    totalQuestions 
  } = useExam();

  if (!isExamActive) return null;

  const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  return (
    <footer className="bg-[#f1f5f9] border-t border-slate-300 p-2 fixed bottom-0 w-full z-10 flex flex-col gap-2">
      <div className="flex justify-between items-center px-4">
        <div className="text-sm font-semibold text-slate-700">
           Question {currentQuestion} of {totalQuestions}
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => toggleReview(currentQuestion)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
                <div className={`w-4 h-4 rounded-sm border ${reviewList.includes(currentQuestion) ? 'bg-blue-600 border-blue-600' : 'border-slate-400 bg-white'} flex items-center justify-center`}>
                    {reviewList.includes(currentQuestion) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
                Review
            </button>
        </div>
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => setCurrentQuestion(q)}
            className={`
              min-w-[32px] h-8 flex items-center justify-center text-sm font-medium rounded-sm border transition-all
              ${
                currentQuestion === q
                  ? "bg-slate-800 text-white border-slate-800"
                  : reviewList.includes(q)
                  ? "bg-blue-100 text-blue-800 border-blue-300 rounded-full" 
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }
            `}
          >
            {q}
          </button>
        ))}
      </div>
      
      <div className="flex justify-between items-center px-4 pb-1">
         <button 
            disabled={currentQuestion === 1}
            onClick={() => setCurrentQuestion(Math.max(1, currentQuestion - 1))}
            className="px-4 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
         >
             &larr; Previous
         </button>
         
         <button 
            disabled={currentQuestion === totalQuestions}
            onClick={() => setCurrentQuestion(Math.min(totalQuestions, currentQuestion + 1))}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
         >
             Next &rarr;
         </button>
      </div>
    </footer>
  );
};
