import mongoose, { Schema, Document, Model } from "mongoose";

export type AttemptStatus = "in_progress" | "submitted" | "evaluated";

export interface IAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  status: AttemptStatus;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent?: number; // in seconds
  // Scores
  rawScore?: number;       // number of correct answers (for objective)
  totalMarks?: number;     // total possible marks
  percentageScore?: number;
  bandScore?: number;      // IELTS band 1-9
  // Module-specific band scores (for full mock tests)
  sectionBands?: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  overallBand?: number;
  // AI evaluation summary (for writing/speaking)
  aiEvaluation?: {
    grammarScore?: number;
    vocabularyScore?: number;
    coherenceScore?: number;
    taskAchievementScore?: number;
    feedback?: string;
    suggestions?: string[];
  };
  // Attempt metadata
  examType: "mock" | "practice";
  module: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema: Schema<IAttempt> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "evaluated"],
      default: "in_progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    timeSpent: {
      type: Number,
    },
    rawScore: {
      type: Number,
    },
    totalMarks: {
      type: Number,
    },
    percentageScore: {
      type: Number,
    },
    bandScore: {
      type: Number,
      min: 0,
      max: 9,
    },
    sectionBands: {
      listening: { type: Number },
      reading: { type: Number },
      writing: { type: Number },
      speaking: { type: Number },
    },
    overallBand: {
      type: Number,
      min: 0,
      max: 9,
    },
    aiEvaluation: {
      grammarScore: { type: Number },
      vocabularyScore: { type: Number },
      coherenceScore: { type: Number },
      taskAchievementScore: { type: Number },
      feedback: { type: String },
      suggestions: [{ type: String }],
    },
    examType: {
      type: String,
      enum: ["mock", "practice"],
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AttemptSchema.index({ userId: 1, testId: 1 });
AttemptSchema.index({ userId: 1, status: 1 });

const Attempt: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>("Attempt", AttemptSchema);

export default Attempt;
