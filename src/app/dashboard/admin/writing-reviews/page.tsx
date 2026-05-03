"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Pencil, X } from "lucide-react";

type PopulatedUser = {
  _id: string;
  name: string;
  email: string;
};

type PopulatedQuestion = {
  _id: string;
  questionText: string;
  questionNumber: number;
};

type Submission = {
  _id: string;
  textAnswer?: string;
  createdAt: string;
  manualReviewRequestedAt?: string;
  userId?: PopulatedUser;
  questionId?: PopulatedQuestion;
  aiEvaluation?: {
    bandScore?: number;
    taskAchievementScore?: number;
    coherenceScore?: number;
    vocabularyScore?: number;
    grammarScore?: number;
    feedback?: string;
    suggestions?: string[];
  };
  writingEvaluation?: {
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overallBand: number;
    feedback: string;
    suggestions: string[];
    evaluatedAt: string;
    evaluatedBy: "ai" | "manual";
    examinerNotes?: string;
  };
};

function toNumber(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function WritingReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [active, setActive] = useState<Submission | null>(null);
  const [saving, setSaving] = useState(false);

  const [scores, setScores] = useState({
    taskAchievement: 5,
    coherenceCohesion: 5,
    lexicalResource: 5,
    grammaticalRange: 5,
  });
  const [feedback, setFeedback] = useState("");
  const [suggestionsText, setSuggestionsText] = useState("");
  const [examinerNotes, setExaminerNotes] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/writing-reviews");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load writing reviews");
      }
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load writing reviews");
    } finally {
      setLoading(false);
    }
  };

  const openReview = (s: Submission) => {
    setSuccessMessage("");
    setError("");
    setActive(s);

    const ai = s.aiEvaluation;
    const we = s.writingEvaluation;

    setScores({
      taskAchievement: toNumber(we?.taskAchievement ?? ai?.taskAchievementScore, 5),
      coherenceCohesion: toNumber(we?.coherenceCohesion ?? ai?.coherenceScore, 5),
      lexicalResource: toNumber(we?.lexicalResource ?? ai?.vocabularyScore, 5),
      grammaticalRange: toNumber(we?.grammaticalRange ?? ai?.grammarScore, 5),
    });

    setFeedback(we?.feedback || ai?.feedback || "");
    setSuggestionsText((we?.suggestions || ai?.suggestions || []).join("\n"));
    setExaminerNotes(we?.examinerNotes || "");
  };

  const closeReview = () => {
    if (saving) return;
    setActive(null);
  };

  const handleSave = async () => {
    if (!active) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const suggestions = suggestionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/writing-reviews/${active._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scores,
          feedback,
          suggestions,
          examinerNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save manual evaluation");
      }

      setSubmissions(submissions.filter((s) => s._id !== active._id));
      setSuccessMessage("Manual evaluation saved");
      setActive(null);
    } catch (err: any) {
      setError(err?.message || "Failed to save manual evaluation");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const totalPending = submissions.length;

  const activeAi = useMemo(() => {
    if (!active) return null;
    const ai = active.aiEvaluation;
    const we = active.writingEvaluation?.evaluatedBy === "ai" ? active.writingEvaluation : null;
    return {
      taskAchievement: we?.taskAchievement ?? ai?.taskAchievementScore,
      coherenceCohesion: we?.coherenceCohesion ?? ai?.coherenceScore,
      lexicalResource: we?.lexicalResource ?? ai?.vocabularyScore,
      grammaticalRange: we?.grammaticalRange ?? ai?.grammarScore,
      overallBand: we?.overallBand ?? ai?.bandScore,
    };
  }, [active]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading writing reviews…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Writing reviews
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Pending manual reviews: <span className="font-extrabold text-slate-900">{totalPending}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-rose-800">Action failed</p>
            <p className="text-sm font-medium text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-emerald-800">Success</p>
            <p className="text-sm font-medium text-emerald-700 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-4xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  AI overall
                </th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No pending writing reviews.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const aiBand = s.writingEvaluation?.evaluatedBy === "ai"
                    ? s.writingEvaluation.overallBand
                    : s.aiEvaluation?.bandScore;
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-extrabold text-slate-900">
                          {s.userId?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-slate-500 font-medium">{s.userId?.email || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">
                        Q{s.questionId?.questionNumber ?? "—"} Writing
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-extrabold tabular-nums">
                        {aiBand ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => openReview(s)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                        >
                          <Pencil className="w-4 h-4" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Manual evaluation</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {active.userId?.name || "Student"} · {new Date(active.createdAt).toLocaleString("en-GB")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="p-2 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Submission</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800 font-medium">
                    {active.textAnswer || ""}
                  </pre>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">AI score</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <ScoreLine label="Task" value={activeAi?.taskAchievement} />
                    <ScoreLine label="C&C" value={activeAi?.coherenceCohesion} />
                    <ScoreLine label="Lexical" value={activeAi?.lexicalResource} />
                    <ScoreLine label="Grammar" value={activeAi?.grammaticalRange} />
                    <ScoreLine label="Overall" value={activeAi?.overallBand} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Override scores</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <NumberField
                      label="Task Achievement / Response"
                      value={scores.taskAchievement}
                      onChange={(v) => setScores({ ...scores, taskAchievement: v })}
                    />
                    <NumberField
                      label="Coherence and Cohesion"
                      value={scores.coherenceCohesion}
                      onChange={(v) => setScores({ ...scores, coherenceCohesion: v })}
                    />
                    <NumberField
                      label="Lexical Resource"
                      value={scores.lexicalResource}
                      onChange={(v) => setScores({ ...scores, lexicalResource: v })}
                    />
                    <NumberField
                      label="Grammatical Range"
                      value={scores.grammaticalRange}
                      onChange={(v) => setScores({ ...scores, grammaticalRange: v })}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full min-h-28 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="Optional: add examiner feedback"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                      Suggestions (one per line)
                    </label>
                    <textarea
                      value={suggestionsText}
                      onChange={(e) => setSuggestionsText(e.target.value)}
                      className="w-full min-h-24 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="Write 3–6 suggestions"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                      Examiner notes
                    </label>
                    <textarea
                      value={examinerNotes}
                      onChange={(e) => setExaminerNotes(e.target.value)}
                      className="w-full min-h-20 px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="Internal notes (not shown to the student unless you use Feedback)"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeReview}
                    disabled={saving}
                    className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-extrabold hover:bg-slate-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save evaluation"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
        {value === undefined || value === null ? "—" : String(value)}
      </span>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </label>
      <input
        type="number"
        min={0}
        max={9}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-extrabold text-slate-900 tabular-nums"
      />
    </div>
  );
}
