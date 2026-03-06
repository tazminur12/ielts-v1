import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestion extends Document {
  testId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  questionNumber: number;  // Global question number within the test (1-40)
  questionText: string;
  questionType:
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
  // Multiple choice options (A, B, C, D)
  options?: {
    label: string;  // A, B, C, D
    text: string;
  }[];
  // Correct answer(s) — not exposed to student
  correctAnswer?: string | string[];
  // For essay/speaking: scoring rubric hints
  scoringCriteria?: string;
  // Speaking prompt details
  speakingPrompt?: string;
  speakingDuration?: number; // seconds
  // Image or resource attached to this question
  imageUrl?: string;
  // Explanation shown after attempt
  explanation?: string;
  marks: number; // points for this question
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema: Schema<IQuestion> = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionGroup",
      required: true,
      index: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: [
        "multiple_choice",
        "true_false_not_given",
        "fill_blank",
        "matching",
        "sentence_completion",
        "short_answer",
        "essay",
        "speaking",
        "matching_headings",
        "summary_completion",
      ],
      required: true,
    },
    options: [
      {
        label: { type: String }, // "A", "B", "C", "D"
        text: { type: String },
      },
    ],
    correctAnswer: {
      type: Schema.Types.Mixed, // string or string[]
      select: false, // NEVER expose to student by default
    },
    scoringCriteria: {
      type: String,
    },
    speakingPrompt: {
      type: String,
    },
    speakingDuration: {
      type: Number,
      default: 60, // 60 seconds default
    },
    imageUrl: {
      type: String, // S3 URL
    },
    explanation: {
      type: String,
      select: false, // Only shown after submission
    },
    marks: {
      type: Number,
      default: 1,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

QuestionSchema.index({ testId: 1, questionNumber: 1 });
QuestionSchema.index({ groupId: 1, order: 1 });

const Question: Model<IQuestion> =
  mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", QuestionSchema);

export default Question;
