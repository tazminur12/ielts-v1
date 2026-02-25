"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const stories = [
  {
    name: "Ayesha Rahman",
    country: "Bangladesh",
    from: "Band 6.0",
    to: "Band 7.5",
    quote:
      "The AI feedback on my essays was so detailed that I knew exactly what to fix before the real test.",
  },
  {
    name: "Imran Khan",
    country: "Pakistan",
    from: "Band 6.5",
    to: "Band 8.0",
    quote:
      "Speaking practice with instant scoring helped me gain confidence and reduce hesitation in the exam.",
  },
  {
    name: "Sara Ali",
    country: "UAE",
    from: "Band 5.5",
    to: "Band 7.0",
    quote:
      "I practiced every day after work and the platform tracked my improvement across all four modules.",
  },
];

export default function SuccessStories() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] overflow-hidden">
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-blue-100/40 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-indigo-100/40 blur-[100px] rounded-full translate-y-1/3 translate-x-1/4" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-blue-600 mb-3">
            Success Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Students who trusted{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
              our AI practice
            </span>
          </h2>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed">
            Real people, real score improvements. Join thousands of learners
            using the platform to reach their dream band score.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {stories.map((story, index) => (
            <motion.article
              key={story.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {story.name}
                  </p>
                  <p className="text-xs text-slate-500">{story.country}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                “{story.quote}”
              </p>

              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
                  {story.from}
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                  {story.to}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

