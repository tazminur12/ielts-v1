'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Trophy,
  Clock,
  HelpCircle,
  ArrowRight,
  Lock,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface Test {
  _id: string;
  title: string;
  module: string;
  totalQuestions: number;
  duration: number;
  difficulty: string;
  accessLevel: string; // 'free' or a plan slug
  status: string;
}

export default function MockTestsPage() {
  const { data: session } = useSession();
  const [tests, setTests] = useState<Test[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Published Mock Tests
        const resTests = await fetch(
          '/api/admin/tests?examType=mock&status=published',
        );
        const dataTests = await resTests.json();

        // 2. Fetch User Subscription
        let subData = null;
        if (session?.user) {
          const resSub = await fetch('/api/subscriptions');
          const dataSub = await resSub.json();
          subData = dataSub.data;
          setActiveSubscription(subData);
        }

        if (dataTests.tests) {
          setTests(dataTests.tests);
        }
      } catch (err) {
        console.error('Error loading tests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  // Helper to check if user can access the test
  const hasAccess = (test: Test) => {
    if (test.accessLevel === 'free') return true;
    if (!activeSubscription) return false;
    // Check if the subscription plan slug matches the test's required access level
    return activeSubscription.planId?.slug === test.accessLevel;
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-8 text-white overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl font-black mb-3">Ready for the Real Test?</h1>
          <p className="text-blue-100 text-sm mb-6 leading-relaxed">
            Our mock tests are designed based on the latest IELTS patterns. Get
            instant AI grading and a predictive band score in minutes.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const firstFree = tests.find(t => t.accessLevel === 'free');
                if (firstFree)
                  window.location.href = `/dashboard/exam/${firstFree._id}`;
              }}
              className="bg-blue-500 hover:bg-blue-400 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              Start Free Mock <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <Trophy size={200} />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800">
        Available Full-Length & Module Exams
      </h2>

      {/* Mock Test List */}
      <div className="grid grid-cols-1 gap-4">
        {tests.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            No mock tests available at the moment.
          </div>
        ) : (
          tests.map(test => {
            const canAccess = hasAccess(test);

            return (
              <div
                key={test._id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between hover:border-blue-300 transition-all gap-6"
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                      canAccess
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {canAccess ? <Trophy size={28} /> : <Lock size={28} />}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {test.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5 capitalize">
                        <CheckCircle size={16} className="text-blue-500" />
                        {test.module}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <HelpCircle size={16} className="text-blue-500" />
                        {test.totalQuestions} Questions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} className="text-blue-500" />
                        {test.duration} min
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-xs uppercase">
                        {test.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex items-center gap-3">
                  {!canAccess && (
                    <Link
                      href="/dashboard/pricing"
                      className="flex-1 md:flex-none"
                    >
                      <button className="w-full px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                        Unlock Premium
                      </button>
                    </Link>
                  )}

                  <Link
                    href={canAccess ? `/dashboard/exam/${test._id}` : '#'}
                    className="flex-1 md:flex-none"
                  >
                    <button
                      disabled={!canAccess}
                      className={`w-full px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        canAccess
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                          : 'bg-slate-900 text-white opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {canAccess ? 'Start Exam' : 'Locked'}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
