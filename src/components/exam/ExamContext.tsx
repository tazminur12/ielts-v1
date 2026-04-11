"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ExamModule = "listening" | "reading" | "writing" | "speaking";

interface ExamState {
  currentModule: ExamModule;
  timeLeft: number; // in seconds
  totalTime: number;
  isExamActive: boolean;
  currentQuestion: number;
  totalQuestions: number;
  reviewList: number[];
}

interface ExamContextType extends ExamState {
  startExam: (module: ExamModule, duration: number, startTotalQuestions?: number) => void;
  finishModule: () => void;
  setTimeLeft: (time: number) => void;
  setCurrentQuestion: (q: number) => void;
  toggleReview: (q: number) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentModule, setCurrentModule] = useState<ExamModule>("listening");
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(40);
  const [reviewList, setReviewList] = useState<number[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamActive) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsExamActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamActive]);

  const startExam = (module: ExamModule, duration: number, startTotalQuestions = 40) => {
    setCurrentModule(module);
    setTotalTime(duration);
    setTimeLeft(duration);
    setIsExamActive(true);
    setTotalQuestions(startTotalQuestions);
    setCurrentQuestion(1);
    setReviewList([]);
  };

  const finishModule = () => {
    setIsExamActive(false);
    // Logic to navigate to next module or results
  };

  const toggleReview = (q: number) => {
    if (reviewList.includes(q)) {
      setReviewList(reviewList.filter((i) => i !== q));
    } else {
      setReviewList([...reviewList, q]);
    }
  };

  return (
    <ExamContext.Provider
      value={{
        currentModule,
        timeLeft,
        totalTime,
        isExamActive,
        currentQuestion,
        totalQuestions,
        reviewList,
        startExam,
        finishModule,
        setTimeLeft,
        setCurrentQuestion,
        toggleReview,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error("useExam must be used within an ExamProvider");
  }
  return context;
};
