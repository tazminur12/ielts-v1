"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    title: "Real Exam Experience",
    description:
      "Sit for full IELTS-style mocks with timing, sections, and difficulty that mirror the real test.",
    tag: "Exam-like Interface",
  },
  {
    title: "AI Feedback in Seconds",
    description:
      "Upload your Writing or Speaking and get instant, detailed band scores with improvement tips.",
    tag: "Instant Evaluation",
  },
  {
    title: "Track Your Progress",
    description:
      "See how your band score improves over time across all four modules with visual analytics.",
    tag: "Smart Analytics",
  },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const activeSlide = slides[current];

  return (
    <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] overflow-hidden">
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-blue-100/40 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-indigo-100/40 blur-[100px] rounded-full translate-y-1/3 translate-x-1/4" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-blue-600 mb-3">
              Home Highlights
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Everything you need to{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                boost your IELTS score
              </span>
            </h2>
            <p className="text-slate-600 text-base md:text-lg mb-8 max-w-xl">
              Rotate through our key benefits and see how the platform supports
              you from your first practice test all the way to exam day.
            </p>

            <div className="flex gap-2 mb-6">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`h-2 w-8 rounded-full transition-all ${
                    index === current
                      ? "bg-blue-600 w-10"
                      : "bg-slate-200 hover:bg-slate-300"
                  }`}
                  aria-label={slide.title}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm"
              >
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
                  {activeSlide.tag}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {activeSlide.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {activeSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex-1 w-full">
            <div className="relative w-full max-w-lg mx-auto">
              <div className="absolute inset-0 bg-linear-to-tr from-blue-100 to-indigo-100 rounded-3xl blur-2xl opacity-80" />
              <div className="relative bg-white border border-slate-100 rounded-3xl shadow-xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Next Practice Session
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      Full IELTS Mock Test
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                    Recommended
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Estimated Band</p>
                    <p className="text-2xl font-bold text-slate-900">6.5 → 7.5</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Time</p>
                    <p className="text-2xl font-bold text-slate-900">2 hr 45 min</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Reading, Listening, Writing & Speaking covered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Instant AI scoring for Writing & Speaking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Personalised tips for your next attempt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

