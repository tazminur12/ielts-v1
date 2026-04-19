'use client';

import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  MapPin,
  Phone,
  Calendar,
  Edit,
  Camera,
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Shield,
  MoreHorizontal,
  Settings,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - in a real app, this would come from an API
  const [userData, _setUserData] = useState({
    phone: '+1 (555) 123-4567',
    location: 'Toronto, Canada',
    bio: 'Aspiring student preparing for IELTS Academic. Targeting Band 7.5+ for university admission in Canada.',
    joinDate: 'January 2024',
    targetScore: '7.5',
    nextExamDate: '2024-04-15',
  });

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Profile Header Card */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative group">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-end -mt-16 mb-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-white bg-white shadow-xl flex items-center justify-center text-blue-600 text-4xl font-bold overflow-hidden">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="bg-blue-50 w-full h-full flex items-center justify-center">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="Change profile picture"
                className="absolute bottom-2 right-2 p-2 bg-slate-900 text-white rounded-xl border-2 border-white shadow-md hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-200"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="md:ml-6 flex-1 pt-4 md:pt-0 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {session?.user?.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide border border-blue-100">
                      Student
                    </span>
                    <span className="text-slate-400 text-sm">•</span>
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <MapPin size={14} /> {userData.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    aria-label="Settings"
                    className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats Grid - Modern */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              {
                label: 'Target Band',
                value: userData.targetScore,
                icon: <TargetIcon />,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Tests Taken',
                value: '12',
                icon: <BookOpen size={20} />,
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                label: 'Practice Time',
                value: '24.5h',
                icon: <Clock size={20} />,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'Success Rate',
                value: '85%',
                icon: <TrendingUp size={20} />,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300"
              >
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-1 space-y-8">
          {/* Bio Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> About Me
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
              &quot;{userData.bio}&quot;
            </p>

            <div className="space-y-5">
              <InfoItem
                icon={<Mail size={18} />}
                label="Email"
                value={session?.user?.email}
              />
              <InfoItem
                icon={<Phone size={18} />}
                label="Phone"
                value={userData.phone}
              />
              <InfoItem
                icon={<Calendar size={18} />}
                label="Joined"
                value={userData.joinDate}
              />
              <InfoItem
                icon={<Shield size={18} />}
                label="Exam Date"
                value={userData.nextExamDate}
              />
            </div>
          </div>

          {/* Skills Card */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" /> Skill Proficiency
            </h3>
            <div className="space-y-6">
              <SkillBar
                label="Listening"
                score="7.5"
                color="bg-blue-500"
                width="85%"
              />
              <SkillBar
                label="Reading"
                score="7.0"
                color="bg-green-500"
                width="78%"
              />
              <SkillBar
                label="Writing"
                score="6.5"
                color="bg-yellow-500"
                width="72%"
              />
              <SkillBar
                label="Speaking"
                score="6.5"
                color="bg-orange-500"
                width="72%"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Edit Form / Activity */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  Edit Profile
                </h3>
                <button
                  type="button"
                  aria-label="Cancel editing"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <LogOut size={20} />
                </button>
              </div>

              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup
                    label="Full Name"
                    defaultValue={session?.user?.name}
                  />
                  <InputGroup
                    label="Email"
                    defaultValue={session?.user?.email}
                    disabled
                  />
                  <InputGroup label="Phone" defaultValue={userData.phone} />
                  <InputGroup
                    label="Location"
                    defaultValue={userData.location}
                  />

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Target Score
                    </label>
                    <div className="relative">
                      <select
                        aria-label="Target Score"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-slate-50 text-slate-700 font-medium"
                      >
                        <option>Band 6.0</option>
                        <option>Band 6.5</option>
                        <option>Band 7.0</option>
                        <option>Band 7.5</option>
                        <option>Band 8.0+</option>
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                        <MoreHorizontal size={16} />
                      </div>
                    </div>
                  </div>

                  <InputGroup
                    label="Next Exam Date"
                    type="date"
                    defaultValue={userData.nextExamDate}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={userData.bio}
                    aria-label="Bio"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-medium resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all"
                    onClick={() => setIsEditing(false)}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  Recent Activity
                </h3>
                <button
                  type="button"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2 flex-1">
                {[
                  {
                    title: 'Completed Reading Mock Test 4',
                    date: '2 hours ago',
                    score: '7.0',
                    type: 'Test',
                  },
                  {
                    title: 'Practiced Speaking Part 2',
                    date: 'Yesterday',
                    score: 'Pending',
                    type: 'Practice',
                  },
                  {
                    title: 'Watched Writing Task 1 Tutorial',
                    date: '2 days ago',
                    score: null,
                    type: 'Learning',
                  },
                  {
                    title: 'Completed Listening Section 3',
                    date: '3 days ago',
                    score: '8.0',
                    type: 'Practice',
                  },
                  {
                    title: 'Completed Reading Mock Test 3',
                    date: '5 days ago',
                    score: '6.5',
                    type: 'Test',
                  },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div
                      className={`p-3 rounded-xl shrink-0 ${
                        activity.type === 'Test'
                          ? 'bg-blue-100 text-blue-600'
                          : activity.type === 'Practice'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {activity.type === 'Test' ? (
                        <Award className="w-5 h-5" />
                      ) : activity.type === 'Practice' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {activity.date}
                      </p>
                    </div>
                    {activity.score && (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          activity.score === 'Pending'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            : 'bg-green-50 text-green-700 border border-green-100'
                        }`}
                      >
                        {activity.score === 'Pending'
                          ? 'Review'
                          : `Band ${activity.score}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components for Cleaner Code
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: any;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-700">
          {value || 'Not set'}
        </p>
      </div>
    </div>
  );
}

function SkillBar({
  label,
  score,
  color,
  width,
}: {
  label: string;
  score: string;
  color: string;
  width: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{score}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: width }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`${color} h-full rounded-full`}
        />
      </div>
    </div>
  );
}

function InputGroup({
  label,
  type = 'text',
  defaultValue,
  disabled = false,
}: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        defaultValue={defaultValue}
        disabled={disabled}
        aria-label={label}
        className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-700'}`}
      />
    </div>
  );
}

function TargetIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}
