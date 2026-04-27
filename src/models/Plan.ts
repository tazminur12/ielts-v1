import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlan extends Document {
  name: string;
  slug: string;
  description: string;
  tierRank: number; // explicit tiering for access (Free=1, Pro=2, Ultimate=3...)
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  features: {
    mockTests: number | "unlimited";
    speakingEvaluations: number | "unlimited";
    writingCorrections: number | "unlimited";
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
    customFeatures?: string[]; // Additional features to display
  };
  limitations?: {
    maxDevices?: number;
    downloadable?: boolean;
  };
  isActive: boolean;
  isPremium: boolean;
  displayOrder: number; // For sorting on pricing page
  trialDays: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema<IPlan> = new Schema(
  {
    name: {
      type: String,
      required: true,
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
      required: true,
    },
    tierRank: {
      type: Number,
      default: 1,
      min: 1,
    },
    price: {
      monthly: {
        type: Number,
        required: true,
        min: 0,
      },
      yearly: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    currency: {
      type: String,
      default: "USD",
    },
    features: {
      mockTests: {
        type: Schema.Types.Mixed,
        required: true,
      },
      speakingEvaluations: {
        type: Schema.Types.Mixed,
        required: true,
      },
      writingCorrections: {
        type: Schema.Types.Mixed,
        required: true,
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
      customFeatures: [
        {
          type: String,
        },
      ],
    },
    limitations: {
      maxDevices: {
        type: Number,
      },
      downloadable: {
        type: Boolean,
        default: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    stripePriceIdMonthly: {
      type: String,
    },
    stripePriceIdYearly: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PlanSchema.index({ slug: 1 });
PlanSchema.index({ isActive: 1, displayOrder: 1 });
PlanSchema.index({ isActive: 1, tierRank: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);

export default Plan;
