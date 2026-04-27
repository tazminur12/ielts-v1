import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Subscription from "@/models/Subscription";
import Test from "@/models/Test";
import User from "@/models/User";

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  createdAt: string; // ISO
  kind: "result" | "billing" | "content" | "system";
};

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  await dbConnect();

  const role = String(session.user.role || "student");
  const userId = session.user.id;

  const items: NotificationItem[] = [];
  const now = new Date();

  if (role === "student") {
    // 1) Results ready (latest evaluated attempts)
    const recentAttempts = await Attempt.find({
      userId,
      status: "evaluated",
    })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate("testId", "title")
      .select("testId updatedAt overallBand bandScore")
      .lean();

    for (const a of recentAttempts as any[]) {
      const title = a?.testId?.title ? String(a.testId.title) : "Your result is ready";
      const band =
        a?.overallBand != null
          ? Number(a.overallBand).toFixed(1)
          : a?.bandScore != null
          ? Number(a.bandScore).toFixed(1)
          : null;
      items.push({
        id: `attempt:${String(a._id)}`,
        kind: "result",
        title: band ? `${title} (Band ${band})` : title,
        description: "Tap to view detailed feedback and breakdown.",
        href: `/exam/results?attemptId=${String(a._id)}`,
        createdAt: new Date(a.updatedAt || now).toISOString(),
      });
    }

    // 2) Subscription expiring soon
    const sub = await Subscription.findOne({
      userId,
      status: { $in: ["active", "trial"] },
      endDate: { $gte: now },
    })
      .sort({ endDate: 1 })
      .populate("planId", "name slug")
      .select("endDate planId status")
      .lean();

    if (sub?.endDate) {
      const end = new Date(sub.endDate);
      const soon = end <= daysFromNow(7);
      if (soon) {
        const planName = (sub as any)?.planId?.name
          ? String((sub as any).planId.name)
          : "Your plan";
        const daysLeft = Math.max(
          0,
          Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
        items.push({
          id: `sub:expiring`,
          kind: "billing",
          title: `${planName} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          description: "Renew to keep full access without interruption.",
          href: "/dashboard/students/subscription",
          createdAt: now.toISOString(),
        });
      }
    }
  } else {
    // Admin / super-admin
    // 1) New registrations (24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: since24h } });
    if (newUsers > 0) {
      items.push({
        id: `admin:new-users:24h`,
        kind: "system",
        title: `${newUsers} new registration${newUsers === 1 ? "" : "s"} in last 24h`,
        description: "Review new accounts and roles.",
        href: "/dashboard/admin/users",
        createdAt: now.toISOString(),
      });
    }

    // 2) New published tests (7d)
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newPublishedTests = await Test.countDocuments({
      status: "published",
      createdAt: { $gte: since7d },
    });
    if (newPublishedTests > 0) {
      items.push({
        id: `admin:published-tests:7d`,
        kind: "content",
        title: `${newPublishedTests} test${newPublishedTests === 1 ? "" : "s"} published in last 7d`,
        description: "Keep content fresh and consistent.",
        href: "/dashboard/admin/mock-tests",
        createdAt: now.toISOString(),
      });
    }

    // 3) Trials running
    const trialSubs = await Subscription.countDocuments({ status: "trial" });
    if (trialSubs > 0) {
      items.push({
        id: `admin:trials`,
        kind: "billing",
        title: `${trialSubs} active trial${trialSubs === 1 ? "" : "s"} running`,
        description: "Monitor conversions and expiry.",
        href: "/dashboard/orders",
        createdAt: now.toISOString(),
      });
    }
  }

  // Keep it small and predictable
  const finalItems = items
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);

  return NextResponse.json({
    success: true,
    items: finalItems,
    total: finalItems.length,
  });
}

