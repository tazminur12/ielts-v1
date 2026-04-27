"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  BookType,
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
    module: "full" as "full",
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
    questionCount: 32,
    questionTypes: ["mixed"] as string[],
  });

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
        `IELTS Full Mock — ${form.ieltsType} · ${form.defaultTheme || "General"}`;

      const topicForApi = form.defaultTheme || form.topic || "General";

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
          questionCount: form.questionCount,
          questionTypes: ["mixed"],
          listeningTopic: form.listeningTopic,
          listeningTitle: form.listeningTitle,
          readingTopic: form.readingTopic,
          readingTitle: form.readingTitle,
          writingTopic: form.writingTopic,
          writingTitle: form.writingTitle,
          speakingTopic: form.speakingTopic,
          speakingTitle: form.speakingTitle,
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

  const maxQuestions = 48;
  const minQuestions = 24;

  return (
    <>
      <AiGenerationLoadingOverlay
        open={loading}
        label="mock exam"
        variant="mock"
      />
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
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
            Generate full mock exam with AI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Creates a full IELTS mock (Listening, Reading, Writing, Speaking) — saved as a draft for review.
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
                Test type
              </label>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-indigo-100 text-indigo-600">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Full Mock Test</div>
                    <div className="text-xs text-slate-600">
                      Generates all 4 modules in one draft (30–90s).
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-white border border-indigo-100 px-3 py-1.5 rounded-full">
                  Fixed
                </span>
              </div>
            </div>

            <div className="space-y-5 pt-2 border-t border-gray-100">
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
                Full mocks usually finish in 30–90 seconds depending on load and prompt length.
              </p>
            </div>
          </form>
        </div>

        <div className="space-y-6 lg:col-span-4">
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
                  Target questions (approx.)
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
