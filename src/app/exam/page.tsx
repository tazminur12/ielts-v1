"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Headphones, PenTool, Mic } from "lucide-react";

function ExamIndexContent() {
  const router = useRouter();
  const params = useSearchParams();
  const testId = params.get("testId");

  // If a testId is provided (e.g. from mock-tests or practice-tests listing),
  // redirect straight to the exam take page.
  useEffect(() => {
    if (testId) {
      const mode = params.get("mode") ?? "mock";
      router.replace(`/exam/take?testId=${testId}&mode=${mode}`);
    }
  }, [testId, params, router]);

  if (testId) return null;

  const modules = [
    { id: "listening", title: "Listening", duration: 30, icon: <Headphones className="w-8 h-8 text-blue-500" />, description: "4 Sections, 40 Questions" },
    { id: "reading", title: "Reading", duration: 60, icon: <BookOpen className="w-8 h-8 text-green-500" />, description: "3 Passages, 40 Questions" },
    { id: "writing", title: "Writing", duration: 60, icon: <PenTool className="w-8 h-8 text-orange-500" />, description: "2 Tasks" },
    { id: "speaking", title: "Speaking", duration: 15, icon: <Mic className="w-8 h-8 text-red-500" />, description: "3 Parts" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">IELTS Exam Simulator</h1>
        <p className="text-slate-600 mb-4 text-center">Select a module to begin, or start from the test library.</p>

        <div className="flex justify-center gap-3 mb-10">
          <Link href="/dashboard/mock-tests" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Browse Mock Tests
          </Link>
          <Link href="/dashboard/practice-tests" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
            Browse Practice Tests
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod) => (
            <Link
              key={mod.id}
              href={`/dashboard/mock-tests`}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-500 transition-all flex items-start text-left group"
            >
              <div className="mr-4 bg-slate-50 p-3 rounded-lg group-hover:bg-blue-50 transition-colors">
                {mod.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{mod.title}</h3>
                <p className="text-sm text-slate-500 font-medium mb-2">{mod.description}</p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{mod.duration} Minutes</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamIndexContent />
    </Suspense>
  );
}
