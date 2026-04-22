"use client";

import Link from "next/link";
import { BookOpen, Headphones, PenTool, Mic, ArrowRight, FileText, Clock, BarChart, ShieldCheck, Target, CheckCircle2 } from "lucide-react";

export default function PracticePage() {
  const modules = [
    {
      title: "Reading Practice",
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
      description: "Improve your reading speed and comprehension with officially structured exam passages.",
      features: ["Academic & General Training", "Detailed explanations", "Vocabulary builder"],
      color: "hover:border-blue-300",
      accent: "bg-blue-50 text-blue-600 border-blue-200",
      link: "/practice/reading"
    },
    {
      title: "Listening Practice",
      icon: <Headphones className="w-6 h-6 text-emerald-600" />,
      description: "Train your ear with diverse accents and realistic audio scenarios from past exams.",
      features: ["Interactive transcripts", "Variable playback speed", "Note-taking tools"],
      color: "hover:border-emerald-300",
      accent: "bg-emerald-50 text-emerald-600 border-emerald-200",
      link: "/practice/listening"
    },
    {
      title: "Writing Practice",
      icon: <PenTool className="w-6 h-6 text-amber-600" />,
      description: "Master Task 1 and Task 2 with instant standard grading and detailed feedback.",
      features: ["Instant band score", "Grammar correction", "Model answers"],
      color: "hover:border-amber-300",
      accent: "bg-amber-50 text-amber-600 border-amber-200",
      link: "/practice/writing"
    },
    {
      title: "Speaking Practice",
      icon: <Mic className="w-6 h-6 text-rose-600" />,
      description: "Practice speaking under exam conditions and gain fluency confidence.",
      features: ["Real-time simulation", "Pronunciation analysis", "Fluency tracking"],
      color: "hover:border-rose-300",
      accent: "bg-rose-50 text-rose-600 border-rose-200",
      link: "/practice/speaking"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Premium Hero */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-indigo-50/70 via-sky-50/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-fuchsia-100/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 py-14 sm:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} />
              Official-style practice
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
              IELTS Practice built for{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-sky-600 to-fuchsia-600">
                real improvement
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed">
              Pick a module. Practice with structured tasks, track your progress, and build the habits
              that raise your band score.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-6 text-xs sm:text-sm text-slate-700">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 border border-slate-200 shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Authentic materials
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 border border-slate-200 shadow-sm">
                <Target size={14} className="text-indigo-600" />
                Band score tracking
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 border border-slate-200 shadow-sm">
                <Clock size={14} className="text-sky-600" />
                Exam-style timing
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 lg:gap-8 mb-14">
          {modules.map((module, index) => (
            <Link 
              href={module.link}
              key={index}
              className={`group bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 flex flex-col ${module.color}`}
            >
              <div className="flex items-start gap-5 mb-6">
                <div className={`p-4 rounded-2xl border shadow-sm ${module.accent} transition-transform group-hover:scale-[1.04]`}>
                  {module.icon}
                </div>
                <div className="pt-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
                    {module.description}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-5 mb-6 grow border border-slate-100">
                <ul className="space-y-3">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm font-medium text-slate-600">
                      <CheckCircle2 size={16} className="text-emerald-500 mr-3 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                  Start Module
                </span>
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats / Trust Section */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 relative z-10">
            <div className="px-4 py-5">
              <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">500+</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Practice tests
              </p>
            </div>
            <div className="px-4 py-5">
              <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">24/7</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Unlimited access
              </p>
            </div>
            <div className="px-4 py-5">
              <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
                <BarChart size={20} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">94%</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Success rate
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
