import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnswer extends Document {
  attemptId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  testId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  questionNumber: number;
  questionType: string;
  // Student's answer
  selectedOption?: string;      // For multiple choice: "A", "B", "C", "D"
  textAnswer?: string;          // For fill_blank, short_answer, essay
  matchedAnswer?: string;       // For matching questions
  booleanAnswer?: "TRUE" | "FALSE" | "NOT GIVEN"; // For T/F/NG
  // For speaking
  audioUrl?: string;            // S3 URL of recorded audio
  transcribedText?: string;     // Speech-to-text result
  // Evaluation
  isCorrect?: boolean;          // For objective questions
  marksAwarded?: number;
  // AI evaluation (for writing/speaking only)
  aiEvaluation?: {
    bandScore?: number;
    fluencyScore?: number;
    pronunciationScore?: number;
    grammarScore?: number;
    vocabularyScore?: number;
    coherenceScore?: number;
    taskAchievementScore?: number;
    feedback?: string;
    suggestions?: string[];
    evaluatedAt?: Date;
  };
  writingEvaluation?: {
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overallBand: number;
    feedback: string;
    suggestions: string[];
    evaluatedAt: Date;
    evaluatedBy: "ai" | "manual";
    examinerNotes?: string;
  };
  manualReviewRequestedAt?: Date;
  // Show correct answer after submission (practice mode)
  correctAnswer?: string | string[];
  timeSpent?: number; // seconds on this question
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema: Schema<IAnswer> = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    guestId: {
      type: String,
      index: true,
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    questionType: {
      type: String,
      required: true,
    },
    selectedOption: {
      type: String, // "A", "B", "C", "D"
    },
    textAnswer: {
      type: String,
    },
    matchedAnswer: {
      type: String,
    },
    booleanAnswer: {
      type: String,
      enum: ["TRUE", "FALSE", "NOT GIVEN"],
    },
    audioUrl: {
      type: String, // S3 URL
    },
    transcribedText: {
      type: String,
    },
    isCorrect: {
      type: Boolean,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
    aiEvaluation: {
      bandScore: { type: Number },
      fluencyScore: { type: Number },
      pronunciationScore: { type: Number },
      grammarScore: { type: Number },
      vocabularyScore: { type: Number },
      coherenceScore: { type: Number },
      taskAchievementScore: { type: Number },
      feedback: { type: String },
      suggestions: [{ type: String }],
      evaluatedAt: { type: Date },
    },
    writingEvaluation: {
      taskAchievement: { type: Number },
      coherenceCohesion: { type: Number },
      lexicalResource: { type: Number },
      grammaticalRange: { type: Number },
      overallBand: { type: Number },
      feedback: { type: String },
      suggestions: [{ type: String }],
      evaluatedAt: { type: Date },
      evaluatedBy: { type: String, enum: ["ai", "manual"] },
      examinerNotes: { type: String },
    },
    manualReviewRequestedAt: {
      type: Date,
      index: true,
    },
    correctAnswer: {
      type: Schema.Types.Mixed,
    },
    timeSpent: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

AnswerSchema.index({ attemptId: 1, questionNumber: 1 });
AnswerSchema.index({ userId: 1, attemptId: 1 });
AnswerSchema.index({ guestId: 1, attemptId: 1 });

// Delete cached model to force rebuild with updated schema
delete (mongoose.models as Record<string, unknown>).Answer;

const Answer: Model<IAnswer> =
  mongoose.models.Answer || mongoose.model<IAnswer>("Answer", AnswerSchema);

export default Answer;
