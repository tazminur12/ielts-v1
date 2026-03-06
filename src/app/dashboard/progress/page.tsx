"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Award,
  MessageSquare,
  BookOpen,
  BarChart3,
  Filter,
  ExternalLink,
} from "lucide-react";
// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionBand { module: string; band: number }

interface Attempt {
  _id: string;
  module: string;
  examType: string;
  status: string;
  bandScore?: number;
  overallBand?: number;
  rawScore?: number;
  sectionBands?: SectionBand[];
  startedAt: string;
  submittedAt?: string;
  testId?: { _id: string; title: string; module: string };
}

// Map attempt data to the shape the existing UI expects
interface ExamResult {
  _id: string;
  examType: "listening" | "reading" | "writing" | "speaking" | "full-test";
  date: string;
  scores: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
    overall: number;
  };
  teacherComments?: {
    teacher: string;
    comment: string;
    commentedAt: string;
  }[];
  status: "completed" | "graded" | "pending";
  attemptId: string;
}

function attemptToResult(a: Attempt): ExamResult {
  const scores: ExamResult["scores"] = { overall: a.overallBand ?? a.bandScore ?? 0 };
  if (a.sectionBands) {
    a.sectionBands.forEach((sb) => {
      (scores as Record<string, number>)[sb.module] = sb.band;
    });
  } else if (a.module && a.module !== "full") {
    (scores as Record<string, number>)[a.module] = a.bandScore ?? 0;
    scores.overall = a.bandScore ?? 0;
  }

  const examType = a.module === "full" ? "full-test"
    : (a.module as ExamResult["examType"]) ?? "full-test";

  const status: ExamResult["status"] =
    a.status === "evaluated" ? "graded"
    : a.status === "submitted" ? "completed"
    : "pending";

  return {
    _id: a._id,
    examType,
    date: a.submittedAt ?? a.startedAt,
    scores,
    teacherComments: [],
    status,
    attemptId: a._id,
  };
}

export default function ProgressPage() {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/attempts");
        if (res.ok) {
          const data = await res.json();
          const attempts: Attempt[] = data.attempts ?? [];
          setExamResults(
            attempts
              .filter((a) => a.status !== "in_progress")
              .map(attemptToResult)
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case "listening":
        return "bg-blue-100 text-blue-800";
      case "reading":
        return "bg-green-100 text-green-800";
      case "writing":
        return "bg-purple-100 text-purple-800";
      case "speaking":
        return "bg-orange-100 text-orange-800";
      case "full-test":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7.0) return "text-green-600";
    if (score >= 6.0) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredResults = examResults.filter((result) => {
    if (filter === "all") return true;
    return result.examType === filter;
  });

  const averageScore =
    examResults.length > 0
      ? (
          examResults.reduce((sum, result) => sum + result.scores.overall, 0) /
          examResults.length
        ).toFixed(1)
      : "0.0";

  const totalTests = examResults.length;
  const testsWithComments = examResults.filter(
    (r) => r.teacherComments && r.teacherComments.length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-500">
            Track your exam results and teacher feedback
          </p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
          View All Results
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Score</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {averageScore}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Improving
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tests</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {totalTests}
              </h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">Exams completed</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Teacher Comments
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {testsWithComments}
              </h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Feedback received
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("full-test")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "full-test"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Full Test
          </button>
          <button
            onClick={() => setFilter("listening")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "listening"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Listening
          </button>
          <button
            onClick={() => setFilter("reading")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "reading"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Reading
          </button>
          <button
            onClick={() => setFilter("writing")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "writing"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Writing
          </button>
          <button
            onClick={() => setFilter("speaking")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "speaking"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Speaking
          </button>
        </div>
      </div>

      {/* Exam Results List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your progress...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No results found
          </h3>
          <p className="mt-2 text-gray-500">
            {filter === "all"
              ? "Start taking tests to see your progress here."
              : `No ${filter} tests found. Try a different filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <div
              key={result._id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Result Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getExamTypeColor(
                        result.examType
                      )}`}
                    >
                      {result.examType.replace("-", " ")}
                    </span>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(result.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="mt-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      {result.scores.listening && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Listening
                          </p>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(
                              result.scores.listening
                            )}`}
                          >
                            {result.scores.listening}
                          </p>
                        </div>
                      )}
                      {result.scores.reading && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Reading</p>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(
                              result.scores.reading
                            )}`}
                          >
                            {result.scores.reading}
                          </p>
                        </div>
                      )}
                      {result.scores.writing && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Writing</p>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(
                              result.scores.writing
                            )}`}
                          >
                            {result.scores.writing}
                          </p>
                        </div>
                      )}
                      {result.scores.speaking && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Speaking</p>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(
                              result.scores.speaking
                            )}`}
                          >
                            {result.scores.speaking}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-6 min-w-35">
                  <Award className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-xs text-gray-600 mb-1">Overall Band</p>
                  <p
                    className={`text-4xl font-bold ${getScoreColor(
                      result.scores.overall
                    )}`}
                  >
                    {result.scores.overall}
                  </p>
                </div>
              </div>

              {/* Teacher Comments */}
              {result.teacherComments && result.teacherComments.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">
                      Teacher Feedback
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {result.teacherComments.map((comment, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.teacher}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.commentedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {comment.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Comments State */}
              {(!result.teacherComments ||
                result.teacherComments.length === 0) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MessageSquare className="w-5 h-5" />
                    <p className="text-sm">
                      {result.status === "pending"
                        ? "Awaiting teacher review"
                        : "No teacher comments yet"}
                    </p>
                  </div>
                </div>
              )}

              {/* View Full Results link */}
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/exam/results?attemptId=${result.attemptId}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink size={13} /> View Full Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
