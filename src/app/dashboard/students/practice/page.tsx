'use client';

import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  FileText,
  Clock,
  BarChart,
  ShieldCheck,
  Target,
  CheckCircle2,
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
      color: 'hover:border-blue-300',
      accent: 'bg-blue-50 text-blue-600 border-blue-200',
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
      color: 'hover:border-emerald-300',
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      link: '/practice/listening',
    },
    {
      title: 'Writing Practice',
      icon: <PenTool className="w-6 h-6 text-amber-600" />,
      description:
        'Master Task 1 and Task 2 with instant standard grading and detailed feedback.',
      features: ['Instant band score', 'Grammar correction', 'Model answers'],
      color: 'hover:border-amber-300',
      accent: 'bg-amber-50 text-amber-600 border-amber-200',
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
      color: 'hover:border-rose-300',
      accent: 'bg-rose-50 text-rose-600 border-rose-200',
      link: '/practice/speaking',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Official-looking Hero Section */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-50 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold mb-2 text-xs uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Official Practice Materials</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Comprehensive <span className="text-blue-600">IELTS Practice</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed mb-4">
            Choose a module to begin. Our standard platform adapts to your level
            and provides instant, actionable feedback to help you achieve your
            target band score.
          </p>

          <div className="flex flex-wrap justify-center gap-2 text-xs md:text-sm text-slate-700">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200 shadow-sm">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Authentic Materials</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200 shadow-sm">
              <Target size={14} className="text-blue-600" />
              <span>Band Score Tracking</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {modules.map((module, index) => (
            <Link
              href={module.link}
              key={index}
              className={`group bg-white rounded-2xl border border-slate-200 p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col ${module.color}`}
            >
              <div className="flex items-start gap-5 mb-6">
                <div
                  className={`p-4 rounded-xl border shadow-sm ${module.accent} transition-transform group-hover:scale-110`}
                >
                  {module.icon}
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
                    {module.description}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 mb-6 flex-grow border border-slate-100">
                <ul className="space-y-3">
                  {module.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center text-sm font-medium text-slate-600"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-emerald-500 mr-3 shrink-0"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                  Start Module
                </span>
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                  <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats / Trust Section */}
        <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

          <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 relative z-10">
            <div className="p-4 transition-transform hover:scale-105">
              <div className="flex justify-center mb-5">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100 shadow-sm">
                  <FileText size={28} />
                </div>
              </div>
              <h4 className="text-3xl font-extrabold text-slate-900 mb-2">
                500+
              </h4>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Practice Tests
              </p>
            </div>
            <div className="p-4 transition-transform hover:scale-105">
              <div className="flex justify-center mb-5">
                <div className="bg-purple-50 text-purple-600 p-3 rounded-xl border border-purple-100 shadow-sm">
                  <Clock size={28} />
                </div>
              </div>
              <h4 className="text-3xl font-extrabold text-slate-900 mb-2">
                24/7
              </h4>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Unlimited Access
              </p>
            </div>
            <div className="p-4 transition-transform hover:scale-105">
              <div className="flex justify-center mb-5">
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100 shadow-sm">
                  <BarChart size={28} />
                </div>
              </div>
              <h4 className="text-3xl font-extrabold text-slate-900 mb-2">
                94%
              </h4>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Success Rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
