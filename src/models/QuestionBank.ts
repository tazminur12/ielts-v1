import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestionBank extends Document {
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
  module: "listening" | "reading" | "writing" | "speaking";
  options?: Array<{
    label: string;
    text: string;
  }>;
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  topic?: string;
  ieltsType?: "academic" | "general";
  usageCount: number;
  createdBy: mongoose.Types.ObjectId;
  aiGenerated: boolean;
  isDeleted: boolean;
  // Versioning fields
  version: number;
  parentQuestionId?: mongoose.Types.ObjectId;
  isLatestVersion: boolean;
  changeLog: Array<{
    version: number;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    summary?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionBankSchema: Schema<IQuestionBank> = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
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
    module: {
      type: String,
      enum: ["listening", "reading", "writing", "speaking"],
      required: true,
    },
    options: [
      {
        label: { type: String },
        text: { type: String },
      },
    ],
    correctAnswer: {
      type: Schema.Types.Mixed,
      select: false,
    },
    explanation: {
      type: String,
      select: false,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    tags: [{ type: String, trim: true }],
    topic: { type: String, trim: true },
    ieltsType: {
      type: String,
      enum: ["academic", "general"],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    parentQuestionId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionBank",
      default: null,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
    },
    changeLog: [
      {
        version: { type: Number },
        changedAt: { type: Date },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        summary: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

QuestionBankSchema.index({ module: 1, questionType: 1 });
QuestionBankSchema.index({ tags: 1 });
QuestionBankSchema.index({ difficulty: 1 });
QuestionBankSchema.index({ topic: 1 });
QuestionBankSchema.index({ isDeleted: 1, createdAt: -1 });

delete (mongoose.models as Record<string, unknown>).QuestionBank;

const QuestionBank: Model<IQuestionBank> =
  mongoose.models.QuestionBank ||
  mongoose.model<IQuestionBank>("QuestionBank", QuestionBankSchema);

export default QuestionBank;
