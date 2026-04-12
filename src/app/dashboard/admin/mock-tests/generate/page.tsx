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
  LayoutGrid,
} from "lucide-react";
import Swal from "sweetalert2";
import { AiGenerationLoadingOverlay } from "@/components/admin/AiGenerationLoadingOverlay";

export default function GenerateMockTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ slug: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    ieltsType: "Academic" as "Academic" | "General",
    module: "reading" as
      | "listening"
      | "reading"
      | "writing"
      | "speaking"
      | "full",
    topic: "",
    /** Fallback when a full-mock section topic is left empty */
    defaultTheme: "",
    listeningTopic: "",
    listeningTitle: "",
    readingTopic: "",
    readingTitle: "",
    writingTopic: "",
    writingTitle: "",
    speakingTopic: "",
    speakingTitle: "",
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
      case "full":
        return [];
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
    if (form.module === "full") {
      setForm((prev) => ({ ...prev, questionCount: 32 }));
      return;
    }
    const types = availableTypesForModule();
    if (types.length > 0) {
      setForm((prev) => ({ ...prev, questionTypes: [types[0].id] }));
    }
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
        `IELTS Mock — ${form.ieltsType} · ${
          form.module === "full"
            ? form.defaultTheme || "General"
            : form.topic || "General"
        } (${form.module})`;

      const topicForApi =
        form.module === "full"
          ? form.defaultTheme || form.topic || "General"
          : form.topic || "General";

      const response = await fetch("/api/admin/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitle,
          examType: "mock",
          ieltsType: form.ieltsType,
          module: form.module,
          topic: topicForApi,
          difficulty: form.difficulty,
          accessLevel: form.accessLevel,
          questionCount:
            form.module === "full"
              ? form.questionCount
              : form.module === "writing"
                ? 2
                : form.module === "speaking"
                  ? 3
                  : form.questionCount,
          questionTypes:
            form.module === "full" ? ["mixed"] : form.questionTypes,
          ...(form.module === "full"
            ? {
                listeningTopic: form.listeningTopic,
                listeningTitle: form.listeningTitle,
                readingTopic: form.readingTopic,
                readingTitle: form.readingTitle,
                writingTopic: form.writingTopic,
                writingTitle: form.writingTitle,
                speakingTopic: form.speakingTopic,
                speakingTitle: form.speakingTitle,
              }
            : {}),
        }),
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.error);

      const manageId = data.testId != null ? String(data.testId) : "";
      if (!manageId) {
        throw new Error("No test id returned from server");
      }

      await Swal.fire({
        title: "Mock test ready",
        text: "Opening Manage — refine sections, use “Generate with AI” for more questions, then publish when ready.",
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
      border: "border-blue-200",
      selBorder: "border-blue-600",
      selBg: "bg-blue-50/80",
    },
    {
      id: "reading",
      name: "Reading",
      icon: BookType,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      selBorder: "border-emerald-600",
      selBg: "bg-emerald-50/80",
    },
    {
      id: "writing",
      name: "Writing",
      icon: PenTool,
      color: "text-violet-500",
      bg: "bg-violet-50",
      border: "border-violet-200",
      selBorder: "border-violet-600",
      selBg: "bg-violet-50/80",
    },
    {
      id: "speaking",
      name: "Speaking",
      icon: Mic,
      color: "text-rose-500",
      bg: "bg-rose-50",
      border: "border-rose-200",
      selBorder: "border-rose-600",
      selBg: "bg-rose-50/80",
    },
    {
      id: "full",
      name: "Full mock",
      icon: LayoutGrid,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      selBorder: "border-indigo-600",
      selBg: "bg-indigo-50/80",
    },
  ];

  const maxQuestions =
    form.module === "full"
      ? 48
      : form.module === "writing"
        ? 2
        : form.module === "speaking"
          ? 3
          : 20;

  const minQuestions = form.module === "full" ? 24 : 1;

  return (
    <>
      <AiGenerationLoadingOverlay
        open={loading}
        label="mock exam"
        variant="mock"
      />
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/mock-tests"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <BrainCircuit className="text-blue-600" />
            Generate mock exam with AI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Timed, exam-style IELTS mock content — saved as draft for your review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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
                Module or full test
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              {form.module === "full" && (
                <p className="text-xs text-gray-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  Full mock generates four sections (Listening, Reading, Writing, Speaking) in one draft.
                  Large output — generation may take 30–90 seconds.
                </p>
              )}
            </div>

            <div className="space-y-5 pt-2 border-t border-gray-100">
              {form.module !== "full" && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Type size={16} className="text-gray-400" />
                    Theme / topic <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Urban development, Health, Education, Environment…"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {form.module === "full" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Set topic and section title for each skill. Empty topic uses the default theme below.
                  </p>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Type size={16} className="text-gray-400" />
                      Default theme <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Used when a section topic is left empty"
                      value={form.defaultTheme}
                      onChange={(e) => setForm({ ...form, defaultTheme: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        label: "Listening",
                        topicKey: "listeningTopic" as const,
                        titleKey: "listeningTitle" as const,
                        border: "border-blue-100",
                        bg: "bg-blue-50/40",
                      },
                      {
                        label: "Reading",
                        topicKey: "readingTopic" as const,
                        titleKey: "readingTitle" as const,
                        border: "border-emerald-100",
                        bg: "bg-emerald-50/40",
                      },
                      {
                        label: "Writing",
                        topicKey: "writingTopic" as const,
                        titleKey: "writingTitle" as const,
                        border: "border-violet-100",
                        bg: "bg-violet-50/40",
                      },
                      {
                        label: "Speaking",
                        topicKey: "speakingTopic" as const,
                        titleKey: "speakingTitle" as const,
                        border: "border-rose-100",
                        bg: "bg-rose-50/40",
                      },
                    ].map((sk) => (
                      <div
                        key={sk.label}
                        className={`rounded-xl border ${sk.border} ${sk.bg} p-4 space-y-3`}
                      >
                        <div className="text-sm font-semibold text-gray-900">{sk.label}</div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Topic</label>
                          <input
                            type="text"
                            placeholder="Section theme"
                            value={form[sk.topicKey]}
                            onChange={(e) =>
                              setForm({ ...form, [sk.topicKey]: e.target.value })
                            }
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Section title</label>
                          <input
                            type="text"
                            placeholder="Optional — e.g. Section 1"
                            value={form[sk.titleKey]}
                            onChange={(e) =>
                              setForm({ ...form, [sk.titleKey]: e.target.value })
                            }
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              {form.module !== "full" && (
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
              )}
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
                    Generating mock exam…
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate mock with AI
                  </>
                )}
                {!loading && (
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Single-module mocks usually finish in 15–45 seconds. Full mocks may take longer.
              </p>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Settings className="text-gray-400 w-5 h-5" />
              Exam settings
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
                  {form.module === "full" ? "Target questions (approx.)" : "Question count"}
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

          <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-blue-950 mb-2">Why this differs from practice</h4>
            <p className="text-xs text-blue-900/90 leading-relaxed">
              Mock tests use exam-style framing, IELTS-appropriate timing on the test record, and
              stricter prompts so students experience a realistic run-through. Always review the
              draft in Manage before publishing.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
