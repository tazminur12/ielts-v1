"use client";

import { useExam } from "./ExamContext";
import { Clock, User } from "lucide-react";
import Image from "next/image";

export const ExamHeader = () => {
  const { timeLeft, currentModule, isExamActive } = useExam();

  if (!isExamActive) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <header className="bg-[#1e293b] text-white p-4 flex justify-between items-center shadow-md select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
           <Image src="/file.svg" alt="Logo" width={32} height={32} className="invert" />
           <span className="font-bold text-lg hidden md:block">IELTS Simulator</span>
        </div>
        <div className="bg-slate-700 px-3 py-1 rounded text-sm uppercase font-semibold tracking-wide">
          {currentModule} Module
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-xl font-mono font-bold text-yellow-400">
          <Clock className="w-5 h-5" />
          <span>{formatTime(timeLeft)}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-slate-300">
          <User className="w-5 h-5" />
          <span className="text-sm">Candidate: John Doe</span>
        </div>
        
        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
          Exit Exam
        </button>
      </div>
    </header>
  );
};
