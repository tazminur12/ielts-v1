import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestionGroup extends Document {
  sectionId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  title?: string;
  instructions?: string;
  order: number;
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
  questionNumberStart: number; // e.g., Q1 to Q10 → start=1
  questionNumberEnd: number;   // e.g., Q1 to Q10 → end=10
  // For matching questions
  matchingOptions?: string[];
  // For true/false: display options are always fixed
  createdAt: Date;
  updatedAt: Date;
}

const QuestionGroupSchema: Schema<IQuestionGroup> = new Schema(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
    },
    order: {
      type: Number,
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
    questionNumberStart: {
      type: Number,
      required: true,
    },
    questionNumberEnd: {
      type: Number,
      required: true,
    },
    matchingOptions: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

QuestionGroupSchema.index({ sectionId: 1, order: 1 });

const QuestionGroup: Model<IQuestionGroup> =
  mongoose.models.QuestionGroup ||
  mongoose.model<IQuestionGroup>("QuestionGroup", QuestionGroupSchema);

export default QuestionGroup;
