"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Star, Activity, CheckCircle2, PlayCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-[#F8FAFC] overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/40 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-100/40 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Content */}
          <div className="flex flex-col items-start text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-100 shadow-sm mb-8"
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-sm font-semibold text-slate-600 tracking-wide uppercase">
                AI-Powered Exam Simulator
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight"
            >
              Master IELTS with <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                Precision & Confidence
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-slate-600 mb-8 max-w-lg leading-relaxed font-medium"
            >
              Stop guessing your score. Get instant, detailed feedback on your
              Writing and Speaking from our advanced AI. Prepare smarter, not
              harder.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link
                href="/exam"
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200"
              >
                Start Free Mock Test
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/about"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <PlayCircle className="mr-2 w-5 h-5 text-slate-400" />
                How it works
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10 flex items-center gap-6 text-sm font-medium text-slate-500"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Band 9.0 Standard</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Instant Results</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Dynamic Visuals */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Main Image with Professional Frame */}
            <div className="relative w-full max-w-md mx-auto">
              <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] rotate-3 opacity-10 scale-105"></div>
              <div className="relative rounded-4xl overflow-hidden shadow-2xl border-[6px] border-white aspect-4/5">
                <Image
                  src="/Hero/student-online2.jpg"
                  alt="IELTS Success"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 520px"
                  className="object-cover"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>
              </div>

              {/* Floating Card 1: Score */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -right-8 top-12 bg-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 max-w-[180px] hidden md:block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">
                      Speaking
                    </p>
                    <p className="text-lg font-bold text-slate-900">Band 8.5</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[85%]"></div>
                </div>
              </motion.div>

              {/* Floating Card 2: User Review */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -left-12 bottom-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 max-w-[220px] hidden md:block"
              >
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-700 font-medium leading-snug">
                  &quot;The AI feedback is incredibly accurate. Helped me jump
                  from 6.5 to 7.5!&quot;
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                      alt="User"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-bold">
                    Sarah K.
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
