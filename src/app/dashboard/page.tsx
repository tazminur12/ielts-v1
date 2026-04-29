import type { ComponentType } from "react";
import {
  BookOpen,
  Clock,
  Target,
  ArrowRight,
  Award,
  Users,
  DollarSign,
  FileText,
  Activity,
  LayoutGrid,
  ClipboardList,
  Sparkles,
  BarChart3,
  ImageIcon,
  GraduationCap,
  Gem,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Assignment from "@/models/Assignment";
import Plan from "@/models/Plan";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import { AdminDashboardProPanel } from "@/components/admin/AdminDashboardProPanel";

type AdminStatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
};

const AdminStatCard = ({ label, value, hint, icon }: AdminStatCardProps) => (
  <div className="rounded-4xl border border-slate-200 bg-white/95 backdrop-blur p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 mt-1">
          {value}
        </p>
        {hint ? <p className="text-xs text-slate-500 font-medium mt-2">{hint}</p> : null}
      </div>
      <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  </div>
);

type PanelProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

const Panel = ({ title, subtitle, right, children }: PanelProps) => (
  <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-extrabold text-slate-900">{title}</p>
        {subtitle ? (
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
    {children}
  </div>
);

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard");
  }

  // Enforce onboarding for students (server-side, independent of middleware token freshness)
  if (session.user.role === "student") {
    await dbConnect();
    const u = await User.findById(session.user.id)
      .select("onboardingCompletedAt")
      .lean();
    if (!u?.onboardingCompletedAt) {
      redirect("/onboarding");
    }
  }
  
  // Connect to DB for admin stats
  if (session?.user?.role === "admin" || session?.user?.role === "super-admin") {
    await dbConnect();

    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: "student" });
    const activeSubs = await Subscription.countDocuments({
      status: { $in: ["active", "trial"] },
    });
    const trialSubs = await Subscription.countDocuments({ status: "trial" });
    const totalAssignments = await Assignment.countDocuments();
    const totalPlans = await Plan.countDocuments();
    const publishedTests = await Test.countDocuments({ status: "published" });
    const mockPublished = await Test.countDocuments({
      examType: "mock",
      status: "published",
    });
    const practicePublished = await Test.countDocuments({
      examType: "practice",
      status: "published",
    });
    const draftTests = await Test.countDocuments({ status: "draft" });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Attempts per day (last 7 days) for charts
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const startDay = new Date(sevenDaysAgo);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date();
    endDay.setHours(23, 59, 59, 999);

    const dailyAgg = await Attempt.aggregate([
      { $match: { startedAt: { $gte: startDay, $lte: endDay } } },
      {
        $group: {
          _id: {
            y: { $year: "$startedAt" },
            m: { $month: "$startedAt" },
            d: { $dayOfMonth: "$startedAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const key = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate()
      ).padStart(2, "0")}`;

    const dailyMap = new Map<string, number>();
    dailyAgg.forEach((r: any) => {
      const k = `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(r._id.d).padStart(2, "0")}`;
      dailyMap.set(k, Number(r.count) || 0);
    });

    const attempts7d = Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(startDay);
      dt.setDate(dt.getDate() + i + 1); // startDay is 7 days ago at 00:00, we want inclusive last 7 days ending today
      const k = key(dt);
      return {
        label: dayLabels[(dt.getDay() + 6) % 7], // JS: Sun=0; map to Mon..Sun
        value: dailyMap.get(k) ?? 0,
      };
    });

    // Registrations per day (last 7 days)
    const regAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDay, $lte: endDay } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const regMap = new Map<string, number>();
    regAgg.forEach((r: any) => {
      const k = `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(r._id.d).padStart(2, "0")}`;
      regMap.set(k, Number(r.count) || 0);
    });

    const registrations7d = Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(startDay);
      dt.setDate(dt.getDate() + i + 1);
      const k = key(dt);
      return {
        label: dayLabels[(dt.getDay() + 6) % 7],
        value: regMap.get(k) ?? 0,
      };
    });

    const newUsers7d = registrations7d.reduce(
      (acc, p) => acc + (Number(p.value) || 0),
      0
    );

    // MRR estimate: sum plan monthly-equivalent for active/trial subs
    const subsForMrr = await Subscription.find({
      status: { $in: ["active", "trial"] },
    })
      .populate("planId", "price")
      .select("billingCycle planId")
      .lean();

    const mrrMonthly = (subsForMrr as any[]).reduce((acc, s) => {
      const plan = s?.planId;
      const monthly = Number(plan?.price?.monthly ?? 0);
      const yearlyMonthlyEquivalent = Number(plan?.price?.yearly ?? 0); // stored as $/month for yearly
      const cycle = String(s?.billingCycle || "monthly");
      const amt = cycle === "yearly" ? yearlyMonthlyEquivalent : monthly;
      return acc + (Number.isFinite(amt) ? amt : 0);
    }, 0);

    const avgRatingAgg = await Test.aggregate([
      { $match: { status: "published", rating: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    const avgTestRating =
      avgRatingAgg?.[0]?.avg != null ? Number(avgRatingAgg[0].avg) : null;

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("name email role createdAt")
      .lean();

    const recentSubs = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("userId", "name email")
      .populate("planId", "name")
      .lean();

    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    type QuickLink = {
      href: string;
      title: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
      color: string;
    };

    const quickLinks: QuickLink[] = [
      {
        href: "/dashboard/admin/users",
        title: "Users",
        description: "Roles, access & accounts",
        icon: Users,
        color: "bg-blue-500 text-white",
      },
      {
        href: "/dashboard/orders",
        title: "Orders & subs",
        description: "Subscriptions & revenue view",
        icon: ScrollText,
        color: "bg-emerald-600 text-white",
      },
      {
        href: "/dashboard/admin/mock-tests",
        title: "Mock tests",
        description: "Full exams & AI generate",
        icon: GraduationCap,
        color: "bg-sky-600 text-white",
      },
      {
        href: "/dashboard/admin/practice-tests",
        title: "Practice tests",
        description: "Module drills & AI",
        icon: BookOpen,
        color: "bg-violet-600 text-white",
      },
      {
        href: "/dashboard/admin/plans",
        title: "Plans",
        description: "Pricing & entitlements",
        icon: LayoutGrid,
        color: "bg-amber-500 text-white",
      },
      {
        href: "/dashboard/analytics",
        title: "Analytics",
        description: "Usage & performance",
        icon: BarChart3,
        color: "bg-slate-700 text-white",
      },
      {
        href: "/dashboard/admin/banners",
        title: "Banners",
        description: "Homepage promos",
        icon: ImageIcon,
        color: "bg-rose-500 text-white",
      },
      {
        href: "/dashboard/admin/mock-tests/generate",
        title: "AI: new mock",
        description: "Generate full mock draft",
        icon: Sparkles,
        color: "bg-linear-to-br from-amber-500 to-orange-600 text-white",
      },
    ];

    function roleBadgeClass(role: string) {
      if (role === "super-admin") return "bg-rose-100 text-rose-800";
      if (role === "admin") return "bg-purple-100 text-purple-800";
      if (role === "staff") return "bg-slate-200 text-slate-800";
      return "bg-emerald-100 text-emerald-800";
    }

    function subStatusClass(status: string) {
      if (status === "active") return "bg-emerald-100 text-emerald-800";
      if (status === "trial") return "bg-sky-100 text-sky-800";
      if (status === "expired") return "bg-slate-100 text-slate-600";
      return "bg-amber-100 text-amber-800";
    }

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
                  {today}
                </span>
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Admin dashboard
              </h1>
              <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                Platform health, content, and billing at a glance — built for
                fast operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/admin/mock-tests/generate"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-extrabold hover:bg-slate-800 shadow-lg shadow-slate-900/10"
              >
                <Sparkles className="w-4 h-4" />
                Generate mock (AI)
              </Link>
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm font-extrabold hover:bg-slate-50"
              >
                <ClipboardList className="w-4 h-4 text-slate-500" />
                Orders
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <AdminStatCard
            label="Total users"
            value={totalUsers}
            hint={
              <>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {studentsCount}
                </span>{" "}
                students
              </>
            }
            icon={<Users className="w-5 h-5 text-blue-700" />}
          />
          <AdminStatCard
            label="Active access"
            value={activeSubs}
            hint={
              trialSubs > 0 ? (
                <>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {trialSubs}
                  </span>{" "}
                  trials running
                </>
              ) : (
                <>active + trial</>
              )
            }
            icon={<DollarSign className="w-5 h-5 text-emerald-700" />}
          />
          <AdminStatCard
            label="Published tests"
            value={publishedTests}
            hint={
              <>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {mockPublished}
                </span>{" "}
                mock ·{" "}
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {practicePublished}
                </span>{" "}
                practice ·{" "}
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {draftTests}
                </span>{" "}
                drafts
              </>
            }
            icon={<BookOpen className="w-5 h-5 text-violet-700" />}
          />
          <AdminStatCard
            label="Assignments"
            value={totalAssignments}
            hint={
              <>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {totalPlans}
                </span>{" "}
                pricing plans
              </>
            }
            icon={<Activity className="w-5 h-5 text-amber-700" />}
          />
        </div>

        {/* Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  Tip
                </p>
                <p className="text-sm text-slate-700 font-medium mt-1">
                  Publish tests from{" "}
                  <Link
                    href="/dashboard/admin/mock-tests"
                    className="font-extrabold text-blue-700 hover:underline"
                  >
                    Mock
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/dashboard/admin/practice-tests"
                    className="font-extrabold text-blue-700 hover:underline"
                  >
                    Practice
                  </Link>{" "}
                  — students only see{" "}
                  <span className="font-extrabold">published</span> content.
                </p>
              </div>
              <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 items-center justify-center shrink-0 hidden sm:flex">
                <FileText className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Professional dashboard charts */}
        <AdminDashboardProPanel
          mrrMonthly={mrrMonthly}
          newUsers7d={newUsers7d}
          activeSubs={activeSubs}
          avgTestRating={avgTestRating}
          attempts7d={attempts7d}
          registrations7d={registrations7d}
        />

        {/* Quick actions */}
        <div>
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Quick actions
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Jump to the most common admin tasks.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-4xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-10 h-10 rounded-3xl flex items-center justify-center ${item.color}`}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </div>
                <p className="text-sm font-extrabold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel
            title="Recent registrations"
            subtitle="New accounts created recently."
            right={
              <Link
                href="/dashboard/admin/users"
                className="text-sm font-extrabold text-blue-700 hover:text-blue-800"
              >
                View all
              </Link>
            }
          >
            <ul className="divide-y divide-slate-100">
              {recentUsers.map((raw, idx) => {
                const user = raw as {
                  _id?: unknown;
                  name?: string;
                  email?: string;
                  role?: string;
                };
                return (
                  <li
                    key={user._id != null ? String(user._id) : `u-${idx}`}
                    className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                  >
                    <Link
                      href="/dashboard/admin/users"
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0">
                          {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wide ${roleBadgeClass(
                          String(user.role || "student")
                        )}`}
                      >
                        {user.role || "student"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {recentUsers.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-500">
                  No users yet.
                </li>
              )}
            </ul>
          </Panel>

          <Panel
            title="Recent subscriptions"
            subtitle="Latest plan activity."
            right={
              <Link
                href="/dashboard/orders"
                className="text-sm font-extrabold text-blue-700 hover:text-blue-800"
              >
                Orders
              </Link>
            }
          >
            <ul className="divide-y divide-slate-100">
              {(recentSubs as unknown as {
                _id: string;
                status?: string;
                userId?: { name?: string; email?: string };
                planId?: { name?: string };
              }[]).map((sub) => {
                const u = sub.userId;
                const p = sub.planId;
                const name =
                  (u && typeof u === "object" && "name" in u && u.name) ||
                  (u && typeof u === "object" && "email" in u && u.email) ||
                  "User";
                const planName =
                  p && typeof p === "object" && "name" in p && p.name
                    ? String(p.name)
                    : "Plan";
                return (
                  <li
                    key={String(sub._id)}
                    className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                  >
                    <Link
                      href="/dashboard/orders"
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">
                          {String(name)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {planName}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wide shrink-0 ${subStatusClass(
                          String(sub.status || "")
                        )}`}
                      >
                        {sub.status || "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {recentSubs.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-500">
                  No subscription activity yet.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    );
  }

  // Student Dashboard
  await dbConnect();
  
  const userId = session?.user?.id;

  // User profile meta (target, next exam date)
  const student = await User.findById(userId)
    .select("name email targetScore nextExamDate")
    .lean() as { name?: string; email?: string; targetScore?: string; nextExamDate?: Date } | null;

  // Active plan (if any)
  const activeSub = await Subscription.findOne({
    userId,
    status: { $in: ["active", "trial"] },
    endDate: { $gte: new Date() },
  })
    .populate("planId", "name slug isPremium")
    .lean() as
    | (Omit<Record<string, unknown>, never> & {
        status: string;
        endDate: Date;
        billingCycle?: string;
        planId?: { name?: string; slug?: string; isPremium?: boolean };
      })
    | null;
  
  // Total Mock Tests Taken
  const totalMockTests = await Attempt.countDocuments({
    userId,
    status: { $in: ["submitted", "evaluated"] },
  });

  // Recent Attempts
  const recentAttempts = await Attempt.find({ userId })
    .sort({ startedAt: -1 })
    .limit(5)
    .populate("testId", "title module examType")
    .lean();

  // Average Band Score
  const allEvaluated = await Attempt.find({ 
    userId, 
    status: "evaluated", 
    bandScore: { $exists: true } 
  }).lean();
  
  const avgBandRaw = allEvaluated.length > 0 
    ? allEvaluated.reduce((acc, curr) => acc + (curr.bandScore || 0), 0) / allEvaluated.length 
    : 0;
  const avgBandScore = avgBandRaw > 0 ? avgBandRaw.toFixed(1) : "N/A";

  // Total Practice Time (in hours)
  const allCompleted = await Attempt.find({ 
    userId, 
    status: { $in: ["submitted", "evaluated"] }, 
    timeSpent: { $exists: true } 
  }).lean();
  const totalTimeSeconds = allCompleted.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
  const totalHours = (totalTimeSeconds / 3600).toFixed(1);

  const evaluatedCount = allEvaluated.length;
  const bestBand =
    evaluatedCount > 0
      ? allEvaluated.reduce((max, a: any) => Math.max(max, Number(a.bandScore || 0)), 0).toFixed(1)
      : "—";

  const nextExam = student?.nextExamDate
    ? new Date(student.nextExamDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const planName = activeSub?.planId?.name || "Free";
  const planStatus = activeSub?.status || "free";
  const planUntil = activeSub?.endDate
    ? new Date(activeSub.endDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {today}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Welcome back, {student?.name || session?.user?.name || "Student"}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Your IELTS practice hub — pick a task, stay consistent, and track your progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/mock-tests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Start a full mock
          </Link>
          <Link
            href="/dashboard/students/practice"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Practice modules
          </Link>
        </div>
      </div>

      {/* Plan strip */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current plan
            </p>
            <p className="text-lg font-extrabold text-slate-900 truncate">
              {planName}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {planStatus !== "free" ? `Status: ${planStatus}` : "No active subscription"}
              {planUntil ? ` · Valid until ${planUntil}` : ""}
              {nextExam ? ` · Next exam: ${nextExam}` : ""}
            </p>
          </div>
          <Link
            href="/dashboard/students/subscription"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shrink-0"
          >
            <Gem className="w-4 h-4" />
            Manage subscription
          </Link>
        </div>
        <div className="px-5 py-4 bg-slate-50/60 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">
            Target band:{" "}
            <span className="font-semibold text-slate-900">
              {student?.targetScore || "Not set"}
            </span>
          </span>
          <span className="text-slate-300">•</span>
          <Link href="/dashboard/students/profile" className="text-blue-600 font-semibold hover:underline">
            Update profile
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/dashboard/students/results" className="text-blue-600 font-semibold hover:underline">
            View results
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Practice time</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                {totalHours}h
              </p>
              <p className="text-xs text-slate-500 mt-2">Time spent in submitted attempts</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Mocks completed</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                {totalMockTests}
              </p>
              <p className="text-xs text-slate-500 mt-2">Submitted/evaluated mock tests</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Average band</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                {avgBandScore}
              </p>
              <p className="text-xs text-slate-500 mt-2">From evaluated attempts only</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Best band</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                {bestBand}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Personal best (evaluated)
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recent activity</p>
              <p className="text-xs text-slate-500 mt-0.5">Pick up where you left off.</p>
            </div>
            <Link
              href="/dashboard/progress"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              View progress
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentAttempts.length > 0 ? (
              recentAttempts.map((item: any) => {
                const title = item.testId?.title || `${item.module} Exam`;
                const date = new Date(item.startedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const status =
                  item.status === "in_progress"
                    ? { label: "In progress", cls: "bg-amber-50 text-amber-900 border-amber-200" }
                    : item.status === "evaluated"
                    ? { label: "Evaluated", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" }
                    : { label: "Submitted", cls: "bg-sky-50 text-sky-800 border-sky-200" };

                const right =
                  item.status === "in_progress"
                    ? { text: "Resume", href: `/exam?testId=${String(item.testId?._id || "")}` }
                    : { text: "View", href: `/exam/results?attemptId=${String(item._id)}` };

                return (
                  <Link
                    key={String(item._id)}
                    href={right.href}
                    className="px-5 py-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {String(item.module)} · {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wide ${status.cls}`}>
                        {status.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {right.text}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-600">No attempts yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Start a mock test to generate your first report.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link
                    href="/dashboard/mock-tests"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Start mock
                  </Link>
                  <Link
                    href="/dashboard/students/practice"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    <ClipboardList className="w-4 h-4 text-slate-500" />
                    Practice
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Next steps</p>
            <p className="text-xs text-slate-500 mt-0.5">
              A simple plan that moves your score.
            </p>
          </div>
          <div className="p-5 space-y-4">
            <Link
              href="/dashboard/students/practice"
              className="block rounded-2xl border border-slate-200 bg-linear-to-br from-sky-50 to-indigo-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Daily practice
              </p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                20 minutes — Reading & Listening
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Build speed and accuracy with timed sets.
              </p>
              <p className="text-sm font-semibold text-blue-700 mt-3 inline-flex items-center gap-2">
                Start modules <ArrowRight className="w-4 h-4" />
              </p>
            </Link>

            <Link
              href="/dashboard/mock-tests"
              className="block rounded-2xl border border-slate-200 bg-linear-to-br from-amber-50 to-rose-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Weekly mock
              </p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                Take 1 full mock under exam timing
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Then review mistakes and track improvement.
              </p>
              <p className="text-sm font-semibold text-indigo-700 mt-3 inline-flex items-center gap-2">
                Browse mocks <ArrowRight className="w-4 h-4" />
              </p>
            </Link>

            <Link
              href="/dashboard/students/profile"
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
            >
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Personalise
              </p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                Set your target and exam date
              </p>
              <p className="text-sm text-slate-600 mt-1">
                We’ll keep your dashboard aligned to your goal.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
