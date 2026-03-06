import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISection extends Document {
  testId: mongoose.Types.ObjectId;
  title: string;
  order: number; // 1,2,3,4 for Listening Parts; 1,2,3 for Reading Passages; etc.
  sectionType:
    | "listening_part"
    | "reading_passage"
    | "writing_task"
    | "speaking_part";
  instructions?: string;
  audioUrl?: string;        // S3 URL for listening audio
  audioTranscript?: string; // Transcript text for listening
  passageText?: string;     // Reading passage content
  passageImage?: string;    // S3 URL for reading images
  timeLimit?: number;       // In minutes (optional per section)
  totalQuestions: number;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema<ISection> = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    sectionType: {
      type: String,
      enum: [
        "listening_part",
        "reading_passage",
        "writing_task",
        "speaking_part",
      ],
      required: true,
    },
    instructions: {
      type: String,
    },
    audioUrl: {
      type: String, // S3 URL
    },
    audioTranscript: {
      type: String,
    },
    passageText: {
      type: String,
    },
    passageImage: {
      type: String, // S3 URL
    },
    timeLimit: {
      type: Number,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

SectionSchema.index({ testId: 1, order: 1 });

const Section: Model<ISection> =
  mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema);

export default Section;
