// Script to seed default plans
// Run with: node scripts/seedPlans.mjs

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ielts";

const planSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  price: {
    monthly: Number,
    yearly: Number,
  },
  currency: String,
  features: {
    mockTests: mongoose.Schema.Types.Mixed,
    speakingEvaluations: mongoose.Schema.Types.Mixed,
    writingCorrections: mongoose.Schema.Types.Mixed,
    hasAnalytics: Boolean,
    hasPersonalizedPlan: Boolean,
    hasPrioritySupport: Boolean,
    has1on1Coaching: Boolean,
    customFeatures: [String],
  },
  isActive: Boolean,
  isPremium: Boolean,
  displayOrder: Number,
  trialDays: Number,
}, { timestamps: true });

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

const defaultPlans = [
  {
    name: "Free Trial",
    slug: "free-trial",
    description: "Try once, no signup required",
    price: {
      monthly: 0,
      yearly: 0,
    },
    currency: "USD",
    features: {
      mockTests: 1,
      speakingEvaluations: 1,
      writingCorrections: 1,
      hasAnalytics: false,
      hasPersonalizedPlan: false,
      hasPrioritySupport: false,
      has1on1Coaching: false,
      customFeatures: [
        "No login required",
        "Instant AI score",
        "Try before you commit",
      ],
    },
    isActive: true,
    isPremium: false,
    displayOrder: 1,
    trialDays: 0,
  },
  {
    name: "Pro Achiever",
    slug: "pro-achiever",
    description: "Everything you need to succeed",
    price: {
      monthly: 29,
      yearly: 19, // 20% discount
    },
    currency: "USD",
    features: {
      mockTests: "unlimited",
      speakingEvaluations: 10,
      writingCorrections: 10,
      hasAnalytics: true,
      hasPersonalizedPlan: false,
      hasPrioritySupport: true,
      has1on1Coaching: false,
      customFeatures: [
        "Advanced Vocabulary Builder",
        "Progress Tracking",
      ],
    },
    isActive: true,
    isPremium: true,
    displayOrder: 2,
    trialDays: 7,
  },
  {
    name: "Ultimate",
    slug: "ultimate",
    description: "For dedicated high achievers",
    price: {
      monthly: 59,
      yearly: 49, // 17% discount
    },
    currency: "USD",
    features: {
      mockTests: "unlimited",
      speakingEvaluations: "unlimited",
      writingCorrections: "unlimited",
      hasAnalytics: true,
      hasPersonalizedPlan: true,
      hasPrioritySupport: true,
      has1on1Coaching: true,
      customFeatures: [
        "Weakness Detection System",
        "24/7 Priority Support",
        "Personalized Study Path",
      ],
    },
    isActive: true,
    isPremium: false,
    displayOrder: 3,
    trialDays: 7,
  },
];

async function seedPlans() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    // Clear existing plans
    console.log("Clearing existing plans...");
    await Plan.deleteMany({});

    // Insert new plans
    console.log("Inserting default plans...");
    const result = await Plan.insertMany(defaultPlans);
    console.log(`✅ Successfully inserted ${result.length} plans`);

    console.log("\nPlans created:");
    result.forEach((plan) => {
      console.log(`  - ${plan.name} (${plan.slug})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding plans:", error);
    process.exit(1);
  }
}

seedPlans();
