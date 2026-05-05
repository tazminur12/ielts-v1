import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestion extends Document {
  testId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  questionBankId?: mongoose.Types.ObjectId; // Reference to question bank
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
  speakingAudioUrl?: string; // Examiner voice for the question (S3 URL)
  // Image or resource attached to this question
  imageUrl?: string;
  // Explanation shown after attempt
  explanation?: string;
  marks: number; // points for this question
  order: number;
  // New fields for enhanced analytics
  skill?: "listening" | "reading" | "writing" | "speaking";
  bandLevel?: number; // 1-9 band level difficulty
  topic?: string; // Topic tag for filtering
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
    questionBankId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionBank",
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
    speakingAudioUrl: {
      type: String, // S3 URL for examiner voice audio
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
    skill: {
      type: String,
      enum: ["listening", "reading", "writing", "speaking"],
    },
    bandLevel: {
      type: Number,
      min: 1,
      max: 9,
    },
    topic: {
      type: String,
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
