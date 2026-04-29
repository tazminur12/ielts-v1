import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITest extends Document {
  title: string;
  slug: string;
  description?: string;
  examType: "mock" | "practice";
  type?: string; // e.g. "Academic", "General", "Speaking Only"
  module: "listening" | "reading" | "writing" | "speaking" | "full";
  accessLevel: string; // any plan slug — no fixed enum
  duration: number; // in minutes (0 = no timer for practice)
  totalQuestions: number;
  status: "draft" | "published";
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  rating?: number; // 0–5
  usersCount?: number; // number of users who have taken the test
  targetBand?: number;
  instructions?: string;
  coverImage?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestSchema: Schema<ITest> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    examType: {
      type: String,
      enum: ["mock", "practice"],
      required: true,
    },
    type: {
      type: String,
      trim: true, // e.g. "Academic", "General", "Speaking Only"
    },
    module: {
      type: String,
      enum: ["listening", "reading", "writing", "speaking", "full"],
      required: true,
    },
    accessLevel: {
      type: String,
      // Not using a fixed enum — accepts any plan slug (e.g. "free", "pro", "ultimate", or custom slugs)
      default: "free",
    },
    duration: {
      type: Number,
      default: 0, // 0 = no strict timer (for practice)
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    tags: [{ type: String, trim: true }],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    usersCount: {
      type: Number,
      default: 0,
    },
    targetBand: {
      type: Number,
      min: 1,
      max: 9,
    },
    instructions: {
      type: String,
    },
    coverImage: {
      type: String, // S3 URL
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Query patterns:
// - public list: status + examType + module, sorted by createdAt desc
// - admin list: examType/module/status filters, sorted by createdAt desc
TestSchema.index({ status: 1, examType: 1, module: 1, createdAt: -1 });

// Delete cached model to force rebuild with updated schema (avoids stale enum errors)
delete (mongoose.models as Record<string, unknown>).Test;

const Test: Model<ITest> =
  mongoose.models.Test || mongoose.model<ITest>("Test", TestSchema);

export default Test;
