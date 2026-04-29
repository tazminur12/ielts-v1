import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: "active" | "cancelled" | "expired" | "trial";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  billingCycle?: "monthly" | "yearly";
  paymentMethod?: string;
  transactionId?: string;
  features: {
    mockTests: number | "unlimited"; // -1 for unlimited, or specific number
    mockTestsUsed: number;
    speakingEvaluations: number | "unlimited";
    speakingEvaluationsUsed: number;
    writingCorrections: number | "unlimited";
    writingCorrectionsUsed: number;
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema<ISubscription> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "trial"],
      default: "trial",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bkash", "nagad", "rocket", "bank_transfer"],
    },
    transactionId: {
      type: String,
    },
    features: {
      mockTests: {
        type: Schema.Types.Mixed, // Can be number or "unlimited"
        default: 0,
      },
      mockTestsUsed: {
        type: Number,
        default: 0,
      },
      speakingEvaluations: {
        type: Schema.Types.Mixed,
        default: 0,
      },
      speakingEvaluationsUsed: {
        type: Number,
        default: 0,
      },
      writingCorrections: {
        type: Schema.Types.Mixed,
        default: 0,
      },
      writingCorrectionsUsed: {
        type: Number,
        default: 0,
      },
      hasAnalytics: {
        type: Boolean,
        default: false,
      },
      hasPersonalizedPlan: {
        type: Boolean,
        default: false,
      },
      hasPrioritySupport: {
        type: Boolean,
        default: false,
      },
      has1on1Coaching: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, status: 1, endDate: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;
