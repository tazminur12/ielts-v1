import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";

export interface UserAccess {
  hasAccess: boolean;
  subscription: any;
  plan: any;
  features: {
    canTakeMockTest: boolean;
    remainingMockTests: number | "unlimited";
    canGetSpeakingEvaluation: boolean;
    remainingSpeakingEvaluations: number | "unlimited";
    canGetWritingCorrection: boolean;
    remainingWritingCorrections: number | "unlimited";
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
  };
  isExpired: boolean;
  isTrial: boolean;
}

/**
 * Check if user has access to a specific feature
 */
export async function checkUserAccess(
  userId?: string
): Promise<UserAccess | null> {
  if (!userId) {
    return null;
  }

  try {
    await dbConnect();

    // Find active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: new Date() },
    })
      .populate("planId")
      .lean();

    if (!subscription) {
      return {
        hasAccess: false,
        subscription: null,
        plan: null,
        features: {
          canTakeMockTest: false,
          remainingMockTests: 0,
          canGetSpeakingEvaluation: false,
          remainingSpeakingEvaluations: 0,
          canGetWritingCorrection: false,
          remainingWritingCorrections: 0,
          hasAnalytics: false,
          hasPersonalizedPlan: false,
          hasPrioritySupport: false,
          has1on1Coaching: false,
        },
        isExpired: true,
        isTrial: false,
      };
    }

    const plan = subscription.planId;
    const features = subscription.features;

    // Calculate remaining resources
    const remainingMockTests =
      features.mockTests === "unlimited"
        ? "unlimited"
        : Math.max(0, Number(features.mockTests) - features.mockTestsUsed);

    const remainingSpeakingEvaluations =
      features.speakingEvaluations === "unlimited"
        ? "unlimited"
        : Math.max(
            0,
            Number(features.speakingEvaluations) - features.speakingEvaluationsUsed
          );

    const remainingWritingCorrections =
      features.writingCorrections === "unlimited"
        ? "unlimited"
        : Math.max(
            0,
            Number(features.writingCorrections) - features.writingCorrectionsUsed
          );

    return {
      hasAccess: true,
      subscription,
      plan,
      features: {
        canTakeMockTest:
          remainingMockTests === "unlimited" || remainingMockTests > 0,
        remainingMockTests,
        canGetSpeakingEvaluation:
          remainingSpeakingEvaluations === "unlimited" ||
          remainingSpeakingEvaluations > 0,
        remainingSpeakingEvaluations,
        canGetWritingCorrection:
          remainingWritingCorrections === "unlimited" ||
          remainingWritingCorrections > 0,
        remainingWritingCorrections,
        hasAnalytics: features.hasAnalytics,
        hasPersonalizedPlan: features.hasPersonalizedPlan,
        hasPrioritySupport: features.hasPrioritySupport,
        has1on1Coaching: features.has1on1Coaching,
      },
      isExpired: false,
      isTrial: subscription.status === "trial",
    };
  } catch (error) {
    console.error("Error checking user access:", error);
    return null;
  }
}

/**
 * Use a feature (decrement usage count)
 */
export async function useFeature(
  userId: string,
  featureType: "mockTest" | "speakingEvaluation" | "writingCorrection"
): Promise<boolean> {
  try {
    await dbConnect();

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: new Date() },
    });

    if (!subscription) {
      return false;
    }

    const featureMap = {
      mockTest: {
        limit: subscription.features.mockTests,
        used: "mockTestsUsed",
      },
      speakingEvaluation: {
        limit: subscription.features.speakingEvaluations,
        used: "speakingEvaluationsUsed",
      },
      writingCorrection: {
        limit: subscription.features.writingCorrections,
        used: "writingCorrectionsUsed",
      },
    };

    const feature = featureMap[featureType];

    // Check if unlimited
    if (feature.limit === "unlimited") {
      subscription.features[feature.used as keyof typeof subscription.features]++;
      await subscription.save();
      return true;
    }

    // Check if has remaining
    const usedCount = subscription.features[feature.used as keyof typeof subscription.features] as number;
    const remaining = Number(feature.limit) - usedCount;
    if (remaining > 0) {
      (subscription.features[feature.used as keyof typeof subscription.features] as number)++;
      await subscription.save();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error using feature:", error);
    return false;
  }
}

/**
 * Get user access from session
 */
export async function getUserAccessFromSession(): Promise<UserAccess | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return checkUserAccess(session.user.id);
}

/**
 * Middleware to check if user has access
 */
export function requireAccess(access: UserAccess | null) {
  if (!access || !access.hasAccess) {
    throw new Error("No active subscription found");
  }
  if (access.isExpired) {
    throw new Error("Subscription has expired");
  }
}
