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
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Assignment from "@/models/Assignment";
import Plan from "@/models/Plan";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
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
    const attemptsLast7Days = await Attempt.countDocuments({
      startedAt: { $gte: sevenDaysAgo },
    });

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
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {today}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-xl">
              Platform health, content, and billing at a glance. Use quick links
              for day-to-day operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/mock-tests/generate"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold shadow-sm hover:from-sky-700 hover:to-blue-800 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate mock (AI)
            </Link>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Orders
            </Link>
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Total users</p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                  {totalUsers}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {studentsCount}
                  </span>{" "}
                  students
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active access
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                  {activeSubs}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="text-emerald-700 font-medium">active + trial</span>
                  {trialSubs > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="tabular-nums">{trialSubs}</span> on trial
                    </>
                  ) : null}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Live tests
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                  {publishedTests}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="tabular-nums">{mockPublished}</span> mock ·{" "}
                  <span className="tabular-nums">{practicePublished}</span> practice
                  <span className="text-slate-400"> · </span>
                  <span className="tabular-nums">{draftTests}</span> drafts
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Content & plans
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">
                  {totalAssignments}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  assignments ·{" "}
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {totalPlans}
                  </span>{" "}
                  pricing plans
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Exam attempts (7d)
              </p>
              <p className="text-xl font-bold tabular-nums text-slate-900">
                {attemptsLast7Days}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-slate-300" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between sm:col-span-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Tip
              </p>
              <p className="text-sm text-slate-700 mt-0.5">
                Publish tests from{" "}
                <Link
                  href="/dashboard/admin/mock-tests"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Mock
                </Link>{" "}
                or{" "}
                <Link
                  href="/dashboard/admin/practice-tests"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Practice
                </Link>{" "}
                — students only see{" "}
                <span className="font-medium">published</span> content.
              </p>
            </div>
            <FileText className="w-8 h-8 text-slate-300 shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${item.color}`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent users */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent registrations</h3>
              <Link
                href="/dashboard/admin/users"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentUsers.map((raw, idx) => {
                const user = raw as {
                  _id?: unknown;
                  name?: string;
                  email?: string;
                  role?: string;
                };
                return (
                <li key={user._id != null ? String(user._id) : `u-${idx}`}>
                  <Link
                    href="/dashboard/admin/users"
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {user.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${roleBadgeClass(
                          String(user.role || "student")
                        )}`}
                      >
                        {user.role || "student"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </Link>
                </li>
                );
              })}
              {recentUsers.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-slate-500">
                  No users yet.
                </li>
              )}
            </ul>
          </div>

          {/* Recent subscriptions */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent subscriptions</h3>
              <Link
                href="/dashboard/orders"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Orders
              </Link>
            </div>
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
                    <li key={String(sub._id)}>
                      <Link
                        href="/dashboard/orders"
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {String(name)}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{planName}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize shrink-0 ${subStatusClass(
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
                <li className="px-5 py-8 text-center text-sm text-slate-500">
                  No subscription activity yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard
  await dbConnect();
  
  const userId = session?.user?.id;
  
  // Total Mock Tests Taken
  const totalMockTests = await Attempt.countDocuments({
    userId,
    status: { $in: ["submitted", "evaluated"] },
  });

  // Recent Attempts
  const recentAttempts = await Attempt.find({ userId })
    .sort({ startedAt: -1 })
    .limit(5)
    .populate("testId", "title")
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

  // Completed Lessons (Mockup feature - setting it statically or based on progress)
  const completedLessons = 3;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session?.user?.name || "Student"}! Here&apos;s your learning overview.</p>
        </div>
        <Link
          href="/start-mock"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Start Practice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Practice Time</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalHours} hrs</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Time spent in mock tests</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mock Tests Taken</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalMockTests}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Total tests submitted</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Band Score</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{avgBandScore}</h3>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {avgBandScore !== "N/A" ? (
              <span className="text-green-600 font-medium flex items-center">
                Keep practicing to improve!
              </span>
            ) : (
             <span className="text-gray-400">Complete more tests to get score</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Lessons</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{completedLessons}/45</h3>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full w-[10%]"></div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/progress" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Progress
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAttempts.length > 0 ? (
              recentAttempts.map((item: any) => (
                <div key={item._id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'in_progress' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{item.testId?.title || `${item.module} Exam`}</h4>
                      <p className="text-xs text-gray-500 capitalize">{item.module} • {new Date(item.startedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'in_progress' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.status === 'in_progress' 
                        ? 'In Progress' 
                        : (item.bandScore ? `Band ${item.bandScore}` : 'Evaluated')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-4" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">No recent mock tests found.</p>
                <Link href="/start-mock" className="text-blue-600 font-medium text-sm mt-2 block hover:underline">
                  Take your first test
                </Link>
              </div>
             )}
          </div>
        </div>

        {/* Recommended Practice */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recommended for You</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-1">Writing Task 2 Strategy</h4>
              <p className="text-sm text-blue-700 mb-3">Improve your essay structure and coherence.</p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                Start Lesson <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <h4 className="font-medium text-purple-900 mb-1">Speaking Part 2</h4>
              <p className="text-sm text-purple-700 mb-3">Practice 2-minute monologue on common topics.</p>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center">
                Start Practice <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
