"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Crown,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  targetScore?: string;
  nextExamDate?: string;
}

interface Subscription {
  _id: string;
  planId: {
    name: string;
    slug: string;
  };
  status: string;
  startDate: string;
  endDate: string;
  features: {
    mockTests: number | string;
    mockTestsUsed: number;
    speakingEvaluations: number | string;
    speakingEvaluationsUsed: number;
    writingCorrections: number | string;
    writingCorrectionsUsed: number;
  };
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    targetScore: "",
    nextExamDate: "",
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchSubscription();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      const data = await response.json();
      if (data.success && data.data) {
        setProfile({
          name: data.data.name || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          location: data.data.location || "",
          bio: data.data.bio || "",
          targetScore: data.data.targetScore || "",
          nextExamDate: data.data.nextExamDate
            ? new Date(data.data.nextExamDate).toISOString().split("T")[0]
            : "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      const data = await response.json();
      if (data.success && data.data) {
        setSubscription(data.data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (data.success) {
        await updateSession();
        await fetchProfile();

        Swal.fire({
          icon: "success",
          title: "Profile Updated!",
          text: "Your profile has been updated successfully.",
          timer: 2000,
        });
        setIsEditing(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
          styles[status] || styles.expired
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateUsagePercentage = (used: number, total: number | string) => {
    if (total === "unlimited") return 0;
    return Math.round((used / Number(total)) * 100);
  };

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "super-admin";
  const isSuperAdmin = session?.user?.role === "super-admin";

  if (isAdmin) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
                {isSuperAdmin ? "Super Admin profile" : "Admin profile"}
              </span>
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {isSuperAdmin ? "Super Admin settings" : "Administrator settings"}
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Update your contact details used for account access and security notifications.
            </p>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800"
              type="button"
            >
              <Edit className="w-4 h-4" />
              Edit profile
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-extrabold text-sm hover:bg-slate-50"
                type="button"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 disabled:opacity-60"
                type="button"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-sm font-extrabold text-slate-900">Administrator information</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep this accurate for login recovery and admin notices.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                icon={<User className="w-4 h-4 text-slate-400" />}
                label="Full name"
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <ReadOnlyValue value={profile.name || "—"} />
                )}
              </Field>

              <Field
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                label="Email address"
              >
                <ReadOnlyValue value={profile.email || "—"} subtle />
              </Field>

              <Field
                icon={<Phone className="w-4 h-4 text-slate-400" />}
                label="Phone number"
              >
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <ReadOnlyValue value={profile.phone || "Not provided"} />
                )}
              </Field>

              <Field
                icon={<MapPin className="w-4 h-4 text-slate-400" />}
                label="Location"
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="City, country"
                  />
                ) : (
                  <ReadOnlyValue value={profile.location || "Not provided"} />
                )}
              </Field>
            </div>

            <div className="px-6 pb-6">
              <Field label="Bio" icon={<ShieldCheck className="w-4 h-4 text-slate-400" />} fullWidth>
                {isEditing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    placeholder="Optional: a short note about your admin role"
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 text-slate-700 font-medium min-h-[110px]">
                    {profile.bio || "No bio added yet"}
                  </div>
                )}
              </Field>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-6 shadow-lg text-white">
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isSuperAdmin ? "text-rose-300" : "text-amber-300"}`} />
                <p className="text-sm font-extrabold">
                  {isSuperAdmin ? "Super Admin access" : "Admin access"}
                </p>
              </div>
              <p className="mt-3 text-2xl font-extrabold">
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {isSuperAdmin
                  ? "Full platform control: users, billing, content, and system settings."
                  : "You can manage users, plans, tests, banners, and review platform activity."}
              </p>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-200">
                  Security tip
                </p>
                <p className="text-sm text-slate-100 mt-1">
                  Use a strong password and keep your email address up to date for recovery.
                </p>
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Account status</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Session</span>
                  <span className="text-slate-900 font-extrabold">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Role</span>
                  <span className="text-slate-900 font-extrabold capitalize">{session?.user?.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600 mt-1">
            Manage your account settings and subscription
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                fetchProfile();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
                    {profile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <p className="text-slate-600 px-4 py-2 bg-slate-50 rounded-lg">
                  {profile.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
                    {profile.phone || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your location"
                  />
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
                    {profile.location || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  About Me
                </label>
                {isEditing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself"
                  />
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg min-h-[100px]">
                    {profile.bio || "No bio added yet"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              IELTS Goals
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Band Score
                </label>
                {isEditing ? (
                  <select
                    aria-label="Target band score"
                    title="Target band score"
                    value={profile.targetScore}
                    onChange={(e) =>
                      setProfile({ ...profile, targetScore: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select target score</option>
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                    <option value="7.5">7.5</option>
                    <option value="8.0">8.0</option>
                    <option value="8.5">8.5</option>
                    <option value="9.0">9.0</option>
                  </select>
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
                    {profile.targetScore || "Not set"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Next Exam Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    aria-label="Next exam date"
                    title="Next exam date"
                    value={profile.nextExamDate}
                    onChange={(e) =>
                      setProfile({ ...profile, nextExamDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
                    {profile.nextExamDate
                      ? new Date(profile.nextExamDate).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {subscription && (
            <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5" />
                <h2 className="text-lg font-bold">Your Plan</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-blue-100 text-sm">Current Plan</p>
                  <p className="text-2xl font-bold">
                    {subscription.planId.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-blue-100 text-sm">Status:</p>
                  {getStatusBadge(subscription.status)}
                </div>

                <div className="pt-3 border-t border-blue-400/30">
                  <p className="text-blue-100 text-sm mb-1">
                    {subscription.status === "active"
                      ? "Valid Until"
                      : "Started On"}
                  </p>
                  <p className="font-medium">
                    {new Date(
                      subscription.status === "active"
                        ? subscription.endDate
                        : subscription.startDate
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="pt-3 border-t border-blue-400/30 space-y-3">
                  <p className="text-blue-100 text-sm font-medium">
                    Feature Usage
                  </p>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Mock Tests</span>
                      <span>
                        {subscription.features.mockTestsUsed} /{" "}
                        {subscription.features.mockTests === "unlimited"
                          ? "∞"
                          : subscription.features.mockTests}
                      </span>
                    </div>
                    <div className="w-full bg-blue-400/30 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all"
                        style={{
                          width:
                            subscription.features.mockTests === "unlimited"
                              ? "0%"
                              : `${calculateUsagePercentage(
                                  subscription.features.mockTestsUsed,
                                  subscription.features.mockTests
                                )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Speaking Evaluations</span>
                      <span>
                        {subscription.features.speakingEvaluationsUsed} /{" "}
                        {subscription.features.speakingEvaluations === "unlimited"
                          ? "∞"
                          : subscription.features.speakingEvaluations}
                      </span>
                    </div>
                    <div className="w-full bg-blue-400/30 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all"
                        style={{
                          width:
                            subscription.features.speakingEvaluations === "unlimited"
                              ? "0%"
                              : `${calculateUsagePercentage(
                                  subscription.features.speakingEvaluationsUsed,
                                  subscription.features.speakingEvaluations
                                )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Writing Corrections</span>
                      <span>
                        {subscription.features.writingCorrectionsUsed} /{" "}
                        {subscription.features.writingCorrections === "unlimited"
                          ? "∞"
                          : subscription.features.writingCorrections}
                      </span>
                    </div>
                    <div className="w-full bg-blue-400/30 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all"
                        style={{
                          width:
                            subscription.features.writingCorrections === "unlimited"
                              ? "0%"
                              : `${calculateUsagePercentage(
                                  subscription.features.writingCorrectionsUsed,
                                  subscription.features.writingCorrections
                                )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Account Stats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Member Since</span>
                <span className="font-medium text-slate-900">
                  {session?.user ? new Date().toLocaleDateString() : "Loading..."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Account Type</span>
                <span className="font-medium text-slate-900 capitalize">
                  {(session?.user as any)?.role || "Student"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  fullWidth,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
        <span className="inline-flex items-center gap-2">
          {icon ? <span className="inline-flex">{icon}</span> : null}
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}

function ReadOnlyValue({ value, subtle }: { value: string; subtle?: boolean }) {
  return (
    <div
      className={[
        "w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 font-semibold",
        subtle ? "text-slate-600" : "text-slate-900",
      ].join(" ")}
    >
      {value}
    </div>
  );
}
