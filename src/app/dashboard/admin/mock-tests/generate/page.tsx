"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  BookType,
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  Trophy,
  Type,
  FileEdit,
  CheckCircle,
  Loader2,
  Sparkles,
  Settings,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import Swal from "sweetalert2";
import { AiGenerationLoadingOverlay } from "@/components/admin/AiGenerationLoadingOverlay";

const INPUT =
  "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const INPUT_MUTED = `${INPUT} bg-gray-50/60`;

export default function GenerateMockTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ slug: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    ieltsType: "Academic" as "Academic" | "General",
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

      const topicForApi = form.defaultTheme || "General";

      const response = await fetch("/api/admin/tests/generate/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitle,
          examType: "mock",
          ieltsType: form.ieltsType,
          module: "full",
          topic: topicForApi,
          difficulty: form.difficulty,
          accessLevel: form.accessLevel,
          questionCount: 80,
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

  return (
    <>
      <AiGenerationLoadingOverlay open={loading} label="mock exam" variant="mock" />

      <div className="max-w-6xl mx-auto pb-12 px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/admin/mock-tests"
              className="mt-1 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-xs font-bold">
                <BrainCircuit size={14} />
                AI Generator
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mt-2 flex items-center gap-2">
                Generate IELTS Full Mock
              </h1>
              <p className="text-gray-600 text-sm mt-2 max-w-2xl leading-relaxed">
                Generates a complete Full Mock with strict official blueprint parity and saves it as a draft for review
                and publishing.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-8">
            <form
              onSubmit={handleGenerate}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <GraduationCap size={16} className="text-gray-400" />
                  IELTS format
                </div>
                <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50/80">
                  {(["Academic", "General"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, ieltsType: t })}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        form.ieltsType === t
                          ? "bg-white text-blue-700 shadow-sm border border-gray-100"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-white shadow-sm border border-indigo-100 text-indigo-700">
                      <LayoutGrid size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">Full Mock Test</p>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        Fixed official structure. Listening and Reading are auto-scored; Writing/Speaking are evaluated
                        by AI after submission.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-indigo-800 bg-white border border-indigo-100 px-3 py-1.5 rounded-full">
                        Official blueprint parity
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-200 text-gray-700">
                      <BookType size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">Content Controls</p>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        Customize themes and base titles per module. Empty fields automatically fall back to the default
                        theme.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-3">
                        Tip: use base titles like “Listening Section” → auto becomes “Listening Section 1–4”.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-extrabold text-gray-900">Themes & titles</p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        defaultTheme: "",
                        listeningTopic: "",
                        listeningTitle: "",
                        readingTopic: "",
                        readingTitle: "",
                        writingTopic: "",
                        writingTitle: "",
                        speakingTopic: "",
                        speakingTitle: "",
                      }))
                    }
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      <Type size={14} className="text-gray-400" />
                      Default theme (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Used when a module topic is left empty"
                      value={form.defaultTheme}
                      onChange={(e) => setForm({ ...form, defaultTheme: e.target.value })}
                      className={`mt-2 ${INPUT_MUTED}`}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ModuleCard
                      icon={<Headphones size={16} />}
                      title="Listening"
                      subtitle="4 sections · 40 questions"
                      tone="blue"
                      topic={form.listeningTopic}
                      baseTitle={form.listeningTitle}
                      onTopicChange={(v) => setForm({ ...form, listeningTopic: v })}
                      onBaseTitleChange={(v) => setForm({ ...form, listeningTitle: v })}
                    />
                    <ModuleCard
                      icon={<BookOpen size={16} />}
                      title="Reading"
                      subtitle="3 passages · 40 questions"
                      tone="emerald"
                      topic={form.readingTopic}
                      baseTitle={form.readingTitle}
                      onTopicChange={(v) => setForm({ ...form, readingTopic: v })}
                      onBaseTitleChange={(v) => setForm({ ...form, readingTitle: v })}
                    />
                    <ModuleCard
                      icon={<PenLine size={16} />}
                      title="Writing"
                      subtitle="Task 1 + Task 2"
                      tone="violet"
                      topic={form.writingTopic}
                      baseTitle={form.writingTitle}
                      onTopicChange={(v) => setForm({ ...form, writingTopic: v })}
                      onBaseTitleChange={(v) => setForm({ ...form, writingTitle: v })}
                    />
                    <ModuleCard
                      icon={<Mic size={16} />}
                      title="Speaking"
                      subtitle="Part 1 + 2 + 3"
                      tone="rose"
                      topic={form.speakingTopic}
                      baseTitle={form.speakingTitle}
                      onTopicChange={(v) => setForm({ ...form, speakingTopic: v })}
                      onBaseTitleChange={(v) => setForm({ ...form, speakingTitle: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                  <FileEdit size={14} className="text-gray-400" />
                  Test list title (optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={INPUT_MUTED}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden bg-blue-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-extrabold text-base hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Generating full mock…
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate with AI
                    </>
                  )}
                  {!loading && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-500 mt-3">
                  Typical generation time: 30–90 seconds.
                </p>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6 lg:sticky lg:top-6">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Settings className="text-gray-400 w-5 h-5" />
                Settings
              </h3>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
                  <Trophy size={14} className="text-gray-400" />
                  Difficulty
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setForm({ ...form, difficulty: diff })}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors capitalize ${
                        form.difficulty === diff
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-sm font-extrabold text-gray-900">Official blueprint</p>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-xs text-gray-800 space-y-2">
                  <BlueprintRow label="Listening" value="4 sections · 40Q · 30 min" />
                  <BlueprintRow label="Reading" value="3 passages · 40Q · 60 min" />
                  <BlueprintRow label="Writing" value="Task 1 + Task 2 · 60 min" />
                  <BlueprintRow label="Speaking" value="Part 1 + 2 + 3" />
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-extrabold tabular-nums">165 min (2:45)</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Counts and timing are locked to match the official IELTS structure.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
                  <CheckCircle size={14} className="text-gray-400" />
                  Access level
                </p>
                <select
                  aria-label="Access level"
                  value={form.accessLevel}
                  onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                  className={INPUT}
                >
                  <option value="free">Free access</option>
                  {plans.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      Required plan: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <p className="text-xs font-extrabold text-blue-950">Workflow</p>
                <ol className="mt-2 text-[11px] text-blue-950/90 space-y-1 list-decimal list-inside">
                  <li>Generate → saved as Draft</li>
                  <li>Open Manage → review/edit</li>
                  <li>Publish when ready</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BlueprintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bold">{label}</span>
      <span className="font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function ModuleCard(input: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "blue" | "emerald" | "violet" | "rose";
  topic: string;
  baseTitle: string;
  onTopicChange: (v: string) => void;
  onBaseTitleChange: (v: string) => void;
}) {
  const tone = {
    blue: { border: "border-blue-100", bg: "bg-blue-50/40", badge: "bg-blue-100 text-blue-800" },
    emerald: { border: "border-emerald-100", bg: "bg-emerald-50/40", badge: "bg-emerald-100 text-emerald-800" },
    violet: { border: "border-violet-100", bg: "bg-violet-50/40", badge: "bg-violet-100 text-violet-800" },
    rose: { border: "border-rose-100", bg: "bg-rose-50/40", badge: "bg-rose-100 text-rose-800" },
  }[input.tone];

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-700">{input.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900">{input.title}</p>
            <p className="text-[11px] text-gray-600 mt-0.5">{input.subtitle}</p>
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full ${tone.badge}`}>Fixed</span>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-700">Topic (optional)</label>
        <input
          type="text"
          placeholder="Module theme (optional)"
          value={input.topic}
          onChange={(e) => input.onTopicChange(e.target.value)}
          className={INPUT}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-700">Base title (optional)</label>
        <input
          type="text"
          placeholder="Example: Listening Section"
          value={input.baseTitle}
          onChange={(e) => input.onBaseTitleChange(e.target.value)}
          className={INPUT}
        />
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Parts/passage numbers append automatically.
        </p>
      </div>
    </div>
  );
}
