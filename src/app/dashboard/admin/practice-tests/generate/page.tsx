"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  BookType,
  Mic,
  Headphones,
  PenTool,
  Trophy,
  Type,
  FileEdit,
  CheckCircle,
  Loader2,
  Sparkles,
  Settings,
  Hash,
  GraduationCap,
} from "lucide-react";
import Swal from "sweetalert2";
import { AiGenerationLoadingOverlay } from "@/components/admin/AiGenerationLoadingOverlay";

export default function GenerateAITestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ slug: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    ieltsType: "Academic" as "Academic" | "General",
    module: "reading" as "listening" | "reading" | "writing" | "speaking",
    topic: "",
    difficulty: "medium",
    accessLevel: "free",
    questionCount: 10,
    questionTypes: ["multiple_choice"] as string[],
  });

  const availableTypesForModule = () => {
    switch (form.module) {
      case "listening":
      case "reading":
        return [
          { id: "multiple_choice", label: "Multiple Choice" },
          { id: "true_false_not_given", label: "True / False / Not Given" },
          { id: "matching_headings", label: "Matching Headings" },
          { id: "short_answer", label: "Short Answer" },
        ];
      case "writing":
        return [
          { id: "essay", label: "Essay (Task 2)" },
          { id: "report", label: "Chart/Graph Report (Task 1)" },
        ];
      case "speaking":
        return [
          { id: "interview", label: "Interview (Part 1)" },
          { id: "cue_card", label: "Cue Card (Part 2)" },
          { id: "discussion", label: "Discussion (Part 3)" },
        ];
      default:
        return [];
    }
  };

  const toggleQuestionType = (typeId: string) => {
    setForm((prev) => {
      const exists = prev.questionTypes.includes(typeId);
      if (exists && prev.questionTypes.length === 1) return prev;
      return {
        ...prev,
        questionTypes: exists
          ? prev.questionTypes.filter((t) => t !== typeId)
          : [...prev.questionTypes, typeId],
      };
    });
  };

  useEffect(() => {
    const types = availableTypesForModule();
    if (types.length === 0) return;
    setForm((prev) => {
      let q = prev.questionCount;
      if (form.module === "writing") q = 2;
      else if (form.module === "speaking") q = 3;
      else {
        if (q === 2 || q === 3) q = 10;
        else if (q < 1 || q > 20) q = 10;
      }
      return { ...prev, questionTypes: [types[0].id], questionCount: q };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.module]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const defaultTitle =
        form.title ||
        `IELTS Practice — ${form.ieltsType} · ${form.topic || "General"} (${form.module})`;

      const response = await fetch("/api/admin/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitle,
          examType: "practice",
          ieltsType: form.ieltsType,
          module: form.module,
          topic: form.topic || "General",
          difficulty: form.difficulty,
          accessLevel: form.accessLevel,
          questionCount:
            form.module === "writing"
              ? 2
              : form.module === "speaking"
                ? 3
                : form.questionCount,
          questionTypes: form.questionTypes,
        }),
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.error);

      const manageId = data.testId != null ? String(data.testId) : "";
      if (!manageId) {
        throw new Error("No test id returned from server");
      }

      await Swal.fire({
        title: "Practice set ready",
        text: "Opening Manage — add more questions with “Generate with AI” if you like, then publish when ready.",
        icon: "success",
        confirmButtonColor: "#2563eb",
      });

      router.push(`/dashboard/admin/tests/${manageId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      Swal.fire("Generation failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      id: "listening",
      name: "Listening",
      icon: Headphones,
      color: "text-blue-500",
      bg: "bg-blue-50",
      selBorder: "border-blue-600",
      selBg: "bg-blue-50/80",
    },
    {
      id: "reading",
      name: "Reading",
      icon: BookType,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      selBorder: "border-emerald-600",
      selBg: "bg-emerald-50/80",
    },
    {
      id: "writing",
      name: "Writing",
      icon: PenTool,
      color: "text-violet-500",
      bg: "bg-violet-50",
      selBorder: "border-violet-600",
      selBg: "bg-violet-50/80",
    },
    {
      id: "speaking",
      name: "Speaking",
      icon: Mic,
      color: "text-rose-500",
      bg: "bg-rose-50",
      selBorder: "border-rose-600",
      selBg: "bg-rose-50/80",
    },
  ];

  const maxQuestions =
    form.module === "writing" ? 2 : form.module === "speaking" ? 3 : 20;
  const minQuestions = 1;

  return (
    <>
      <AiGenerationLoadingOverlay
        open={loading}
        label="practice test"
        variant="practice"
      />
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/practice-tests"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <BrainCircuit className="text-blue-600" />
            Generate practice with AI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Module-focused drills — same quality prompts as mock generation, saved as draft.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <form
            onSubmit={handleGenerate}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8"
          >
            <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <GraduationCap size={16} className="text-gray-400" />
                IELTS format
              </div>
              <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50/80">
                {(["Academic", "General"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, ieltsType: t })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.ieltsType === t
                        ? "bg-white text-blue-700 shadow-sm border border-gray-100"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookType size={16} className="text-gray-400" />
                Module
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {modules.map((m) => {
                  const isSelected = form.module === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, module: m.id as typeof form.module })}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? `${m.selBorder} ${m.selBg} shadow-sm`
                          : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-full mb-2 ${isSelected ? "bg-white shadow-sm" : m.bg}`}
                      >
                        <m.icon
                          size={22}
                          className={isSelected ? m.color : "text-gray-500"}
                        />
                      </div>
                      <span
                        className={`font-semibold text-xs text-center ${isSelected ? "text-gray-900" : "text-gray-600"}`}
                      >
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5 pt-2 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Type size={16} className="text-gray-400" />
                  Topic / theme <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Climate change, urban transport, workplace skills…"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileEdit size={16} className="text-gray-400" />
                  Test list title <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BrainCircuit size={16} className="text-gray-400" />
                  Question types
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableTypesForModule().map((qt) => (
                    <label
                      key={qt.id}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors select-none ${
                        form.questionTypes.includes(qt.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.questionTypes.includes(qt.id)}
                        onChange={() => toggleQuestionType(qt.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">{qt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-blue-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating practice…
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate practice with AI
                  </>
                )}
                {!loading && (
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Usually 5–45 seconds depending on module and question count.
              </p>
            </div>
          </form>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Settings className="text-gray-400 w-5 h-5" />
              Practice settings
            </h3>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Trophy size={16} className="text-gray-400" />
                Difficulty
              </label>
              <div className="space-y-2">
                {["easy", "medium", "hard"].map((diff) => (
                  <label
                    key={diff}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors select-none ${
                      form.difficulty === diff
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={diff}
                      checked={form.difficulty === diff}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="hidden"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.difficulty === diff ? "border-blue-600" : "border-gray-300"
                      }`}
                    >
                      {form.difficulty === diff && (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <span className="capitalize text-sm font-medium text-gray-700">{diff}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Hash size={16} className="text-gray-400" />
                  Question count
                </label>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg text-sm">
                  {form.questionCount}
                </span>
              </div>
              <input
                aria-label="Question count"
                type="range"
                min={minQuestions}
                max={maxQuestions}
                value={form.questionCount}
                onChange={(e) =>
                  setForm({ ...form, questionCount: Number(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>{minQuestions}</span>
                <span>{maxQuestions}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle size={16} className="text-gray-400" />
                Access level
              </label>
              <select
                aria-label="Access level"
                value={form.accessLevel}
                onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="free">Free access</option>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    Required plan: {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Practice vs mock</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Practice sets target one skill at a time with flexible timing. Mock tests use full-exam
              framing and durations. Both use the same generation pipeline and authentic IELTS-style
              prompts — review drafts before publishing.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
