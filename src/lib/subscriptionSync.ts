import dbConnect from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

/** Stripe Checkout Session ids start with cs_ */
function isStripeCheckoutSessionId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("cs_");
}

/**
 * Older bug: paid Stripe checkouts still saved as status "trial" when plan.trialDays > 0.
 * Promote to active with a sensible billing window when we see a Checkout Session id.
 */
export async function repairStripePaidTrialsStillMarkedTrial(): Promise<number> {
  await dbConnect();
  const subs = await Subscription.find({
    status: "trial",
  });

  let n = 0;
  for (const sub of subs) {
    if (!isStripeCheckoutSessionId(sub.transactionId)) continue;

    const start = new Date(sub.startDate);
    const end = new Date(start);
    const cycle = sub.billingCycle || "monthly";
    if (cycle === "yearly") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    if (end < new Date()) {
      end.setTime(Date.now());
      if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
    }

    sub.status = "active";
    sub.endDate = end;
    sub.autoRenew = true;
    if (!sub.billingCycle) sub.billingCycle = "monthly";
    await sub.save();

    await User.findByIdAndUpdate(sub.userId, {
      currentSubscriptionId: sub._id,
    });
    n++;
  }
  return n;
}

/**
 * Marks subscriptions as expired when endDate has passed and clears User.currentSubscriptionId.
 * Call from subscription GET handlers so DB stays aligned with reality without a cron.
 */
export async function syncExpiredSubscriptions(): Promise<number> {
  await dbConnect();
  const now = new Date();

  const stale = await Subscription.find({
    status: { $in: ["active", "trial"] },
    endDate: { $lt: now },
  }).select("_id");

  if (stale.length === 0) return 0;

  const ids = stale.map((s) => s._id);

  await Subscription.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "expired", autoRenew: false } }
  );

  await User.updateMany(
    { currentSubscriptionId: { $in: ids } },
    { $unset: { currentSubscriptionId: 1 } }
  );

  return ids.length;
}
