"use client";

import Link from "next/link";
import { BookOpen, Headphones, PenTool, Mic, ArrowRight, FileText, Clock, BarChart } from "lucide-react";

export default function PracticePage() {
  const modules = [
    {
      title: "Reading Practice",
      icon: <BookOpen className="w-8 h-8 text-green-500" />,
      description: "Improve your reading speed and comprehension with real exam passages.",
      features: ["Academic & General Training", "Detailed explanations", "Vocabulary builder"],
      color: "border-green-100 hover:border-green-300 bg-green-50/50",
      link: "/practice/reading"
    },
    {
      title: "Listening Practice",
      icon: <Headphones className="w-8 h-8 text-blue-500" />,
      description: "Train your ear with diverse accents and realistic audio scenarios.",
      features: ["Interactive transcripts", "Variable playback speed", "Note-taking tools"],
      color: "border-blue-100 hover:border-blue-300 bg-blue-50/50",
      link: "/practice/listening"
    },
    {
      title: "Writing Practice",
      icon: <PenTool className="w-8 h-8 text-orange-500" />,
      description: "Master Task 1 and Task 2 with AI-powered grading and feedback.",
      features: ["Instant band score", "Grammar correction", "Model answers"],
      color: "border-orange-100 hover:border-orange-300 bg-orange-50/50",
      link: "/practice/writing"
    },
    {
      title: "Speaking Practice",
      icon: <Mic className="w-8 h-8 text-red-500" />,
      description: "Practice speaking with our AI examiner and gain fluency confidence.",
      features: ["Real-time simulation", "Pronunciation analysis", "Fluency tracking"],
      color: "border-red-100 hover:border-red-300 bg-red-50/50",
      link: "/practice/speaking"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Comprehensive <span className="text-blue-600">IELTS Practice</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
            Choose a module to start practicing. Our AI-driven platform adapts to your level and provides instant, actionable feedback to help you achieve your target band score.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {modules.map((module, index) => (
            <div 
              key={index}
              className={`group relative bg-white rounded-3xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${module.color}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  {module.icon}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {module.description}
              </p>
              
              <ul className="space-y-3 mb-8">
                {module.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-slate-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link 
                href={module.link}
                className="inline-flex items-center text-slate-900 font-bold hover:text-blue-600 transition-colors"
              >
                Start Practicing <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Stats / Trust Section */}
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
           <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-4">
                 <div className="flex justify-center mb-4 text-blue-500">
                    <FileText size={32} />
                 </div>
                 <h4 className="text-3xl font-black text-slate-900 mb-1">500+</h4>
                 <p className="text-slate-500 font-medium">Practice Tests</p>
              </div>
              <div className="p-4">
                 <div className="flex justify-center mb-4 text-purple-500">
                    <Clock size={32} />
                 </div>
                 <h4 className="text-3xl font-black text-slate-900 mb-1">24/7</h4>
                 <p className="text-slate-500 font-medium">Unlimited Access</p>
              </div>
              <div className="p-4">
                 <div className="flex justify-center mb-4 text-green-500">
                    <BarChart size={32} />
                 </div>
                 <h4 className="text-3xl font-black text-slate-900 mb-1">94%</h4>
                 <p className="text-slate-500 font-medium">Success Rate</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
