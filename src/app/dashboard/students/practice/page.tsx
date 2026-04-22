'use client';

import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Target,
} from 'lucide-react';

export default function PracticePage() {
  const modules = [
    {
      title: 'Reading Practice',
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
      description:
        'Improve your reading speed and comprehension with officially structured exam passages.',
      features: [
        'Academic & General Training',
        'Detailed explanations',
        'Vocabulary builder',
      ],
      tone: 'from-blue-600 via-sky-600 to-indigo-600',
      accent: 'bg-blue-50 text-blue-700 border-blue-200',
      link: '/practice/reading',
    },
    {
      title: 'Listening Practice',
      icon: <Headphones className="w-6 h-6 text-emerald-600" />,
      description:
        'Train your ear with diverse accents and realistic audio scenarios from past exams.',
      features: [
        'Interactive transcripts',
        'Variable playback speed',
        'Note-taking tools',
      ],
      tone: 'from-emerald-600 via-teal-600 to-sky-600',
      accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      link: '/practice/listening',
    },
    {
      title: 'Writing Practice',
      icon: <PenTool className="w-6 h-6 text-amber-600" />,
      description:
        'Master Task 1 and Task 2 with instant standard grading and detailed feedback.',
      features: ['Instant band score', 'Grammar correction', 'Model answers'],
      tone: 'from-amber-600 via-orange-600 to-rose-600',
      accent: 'bg-amber-50 text-amber-800 border-amber-200',
      link: '/practice/writing',
    },
    {
      title: 'Speaking Practice',
      icon: <Mic className="w-6 h-6 text-rose-600" />,
      description:
        'Practice speaking under exam conditions and gain fluency confidence.',
      features: [
        'Real-time simulation',
        'Pronunciation analysis',
        'Fluency tracking',
      ],
      tone: 'from-rose-600 via-fuchsia-600 to-indigo-600',
      accent: 'bg-rose-50 text-rose-700 border-rose-200',
      link: '/practice/speaking',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Practice
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Pick a module, practice with exam-style tasks, and improve your band score with consistent habits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Browse public practice
          </Link>
          <Link
            href="/dashboard/mock-tests"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600 text-white text-sm font-semibold shadow-sm hover:from-indigo-700 hover:via-sky-700 hover:to-fuchsia-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Take a full mock
          </Link>
        </div>
      </div>

      {/* Quick strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Focus</p>
              <p className="text-lg font-bold text-slate-900 mt-1">Daily consistency</p>
              <p className="text-xs text-slate-500 mt-2">
                20–30 minutes per day beats cramming.
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Timing</p>
              <p className="text-lg font-bold text-slate-900 mt-1">Exam-style practice</p>
              <p className="text-xs text-slate-500 mt-2">
                Build speed + accuracy with timed sets.
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Next</p>
              <p className="text-lg font-bold text-slate-900 mt-1">Start a module</p>
              <p className="text-xs text-slate-500 mt-2">
                Choose Reading/Listening/Writing/Speaking.
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {modules.map((module) => (
          <Link
            href={module.link}
            key={module.link}
            className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <div className={`h-1.5 w-full bg-linear-to-r ${module.tone}`} />
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl border shadow-sm ${module.accent}`}>
                  {module.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {module.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <ul className="space-y-2.5">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Start now
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
