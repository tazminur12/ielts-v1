import {
  BookOpen,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  Award,
  Users,
  DollarSign,
  FileText,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Assignment from "@/models/Assignment";
import Plan from "@/models/Plan";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Connect to DB for admin stats
  if (session?.user?.role === "admin" || session?.user?.role === "super-admin") {
    await dbConnect();
    
    // Fetch stats
    const totalUsers = await User.countDocuments();
    const totalSubscriptions = await Subscription.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalPlans = await Plan.countDocuments();

    // Fetch recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt')
      .lean();

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Overview of your platform&apos;s statistics and recent activity.</p>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</h3>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium flex items-center">
                All Registered Users
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalSubscriptions}</h3>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium flex items-center">
                Paid user base
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalAssignments}</h3>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600 font-medium flex items-center">
                Practice materials available
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pricing Plans</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalPlans}</h3>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium flex items-center">
                Active packages
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Registrations</h3>
            <Link href="/dashboard/admin/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.map((user: any, i: number) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {user.name?.[0] || "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{user.name || "Unknown"}</h4>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-4" />
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No recent users found.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s your learning overview.</p>
        </div>
        <Link
          href="/dashboard/practice"
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
              <h3 className="text-2xl font-bold text-gray-900 mt-1">12.5 hrs</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.5 hrs
            </span>
            <span className="text-gray-400 ml-2">vs last week</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mock Tests Taken</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">4</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Next test recommended in 2 days</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Band Score</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">6.5</h3>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +0.5
            </span>
            <span className="text-gray-400 ml-2">improvement</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Lessons</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">18/45</h3>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { title: "Speaking Mock Test #3", type: "Mock Test", score: "6.0", date: "2 hours ago" },
              { title: "Academic Writing Task 1", type: "Practice", score: "Pending", date: "Yesterday" },
              { title: "Listening Section 2", type: "Practice", score: "7.5", date: "2 days ago" },
            ].map((item, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${item.score === 'Pending' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.type} • {item.date}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.score === 'Pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.score === 'Pending' ? 'In Review' : `Band ${item.score}`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-4" />
                </div>
              </div>
            ))}
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
