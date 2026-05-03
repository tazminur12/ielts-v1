import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQueueFailure extends Document {
  queue: string;
  jobId: string;
  name: string;
  data?: unknown;
  failedReason?: string;
  stacktrace?: string[];
  attemptsMade?: number;
  lastFailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QueueFailureSchema: Schema<IQueueFailure> = new Schema(
  {
    queue: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    failedReason: { type: String },
    stacktrace: [{ type: String }],
    attemptsMade: { type: Number },
    lastFailedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

QueueFailureSchema.index({ queue: 1, jobId: 1 }, { unique: true });
QueueFailureSchema.index({ queue: 1, lastFailedAt: -1 });

delete (mongoose.models as Record<string, unknown>).QueueFailure;

const QueueFailure: Model<IQueueFailure> =
  mongoose.models.QueueFailure || mongoose.model<IQueueFailure>("QueueFailure", QueueFailureSchema);

export default QueueFailure;

