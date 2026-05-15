// Shared types for exam section components

export type QuestionType =
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

export interface Option {
  label: string;
  text: string;
}

export interface Question {
  _id: string;
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  options?: Option[];
  matchingOptions?: string[];
  speakingPrompt?: string;
  speakingDuration?: number;
  imageUrl?: string;
  wordLimit?: number;
  marks: number;
  order: number;
}

export interface QuestionGroup {
  _id: string;
  questionType: QuestionType;
  title?: string;
  instructions?: string;
  questionNumberStart: number;
  questionNumberEnd: number;
  matchingOptions?: string[];
  questions: Question[];
}

export interface Section {
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

export interface TestData {
  _id: string;
  title: string;
  module: string;
  examType: string;
  duration: number;
  instructions?: string;
  sections: Section[];
}

export type AnswerMap = Record<string, string>;
