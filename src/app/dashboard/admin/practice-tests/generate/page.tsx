"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Mic,
  Headphones,
  PenLine,
  BookOpen,
  Trophy,
  Type,
  FileEdit,
  CheckCircle,
  Loader2,
  Sparkles,
  Settings,
  GraduationCap,
} from "lucide-react";
import Swal from "sweetalert2";
import { AiGenerationLoadingOverlay } from "@/components/admin/AiGenerationLoadingOverlay";

const INPUT =
  "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const INPUT_MUTED = `${INPUT} bg-gray-50/60`;

export default function GenerateAITestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ slug: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    ieltsType: "Academic" as "Academic" | "General",
    module: "reading" as "listening" | "reading" | "writing" | "speaking",
    topic: "",
    sectionTitleBase: "",
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
      const topicForApi = form.topic?.trim() || "General";
      const defaultTitle =
        form.title ||
        `IELTS Practice — ${form.ieltsType} · ${topicForApi} (${form.module})`;

      const titleBase = form.sectionTitleBase?.trim() || "";
      const titleHints: Record<string, string> =
        form.module === "listening"
          ? { listeningTitle: titleBase }
          : form.module === "reading"
          ? { readingTitle: titleBase }
          : form.module === "writing"
          ? { writingTitle: titleBase }
          : { speakingTitle: titleBase };

      const fixedCount =
        form.module === "listening" || form.module === "reading"
          ? 40
          : form.module === "writing"
          ? 2
          : 3;

      const response = await fetch("/api/admin/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitle,
          examType: "practice",
          ieltsType: form.ieltsType,
          module: form.module,
          topic: topicForApi,
          difficulty: form.difficulty,
          accessLevel: form.accessLevel,
          questionCount: fixedCount,
          questionTypes: ["mixed"],
          ...titleHints,
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

  const moduleInfo = useMemo(() => {
    if (form.module === "listening") {
      return {
        label: "Listening",
        icon: <Headphones size={16} />,
        subtitle: "4 sections · 40 questions · 30 min",
        baseTitlePlaceholder: "Example: Listening Section",
      };
    }
    if (form.module === "reading") {
      return {
        label: "Reading",
        icon: <BookOpen size={16} />,
        subtitle: "3 passages · 40 questions · 60 min",
        baseTitlePlaceholder: "Example: Reading Passage",
      };
    }
    if (form.module === "writing") {
      return {
        label: "Writing",
        icon: <PenLine size={16} />,
        subtitle: "Task 1 + Task 2 · 60 min",
        baseTitlePlaceholder: "Example: Writing Task",
      };
    }
    return {
      label: "Speaking",
      icon: <Mic size={16} />,
      subtitle: "Part 1 + 2 + 3",
      baseTitlePlaceholder: "Example: Speaking Part",
    };
  }, [form.module]);

  return (
    <>
      <AiGenerationLoadingOverlay open={loading} label="practice module" variant="practice" />

      <div className="max-w-6xl mx-auto pb-12 px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard/admin/practice-tests"
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
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mt-2">
                Generate IELTS Practice Module
              </h1>
              <p className="text-gray-600 text-sm mt-2 max-w-2xl leading-relaxed">
                Generates a full official module (not a shortened drill) and saves it as a draft for review and
                publishing.
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

              <div className="space-y-3">
                <p className="text-sm font-extrabold text-gray-900">Module</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ModuleTile
                    selected={form.module === "listening"}
                    label="Listening"
                    icon={<Headphones size={18} />}
                    sub="4 sections"
                    onClick={() => setForm({ ...form, module: "listening", sectionTitleBase: "" })}
                    tone="blue"
                  />
                  <ModuleTile
                    selected={form.module === "reading"}
                    label="Reading"
                    icon={<BookOpen size={18} />}
                    sub="3 passages"
                    onClick={() => setForm({ ...form, module: "reading", sectionTitleBase: "" })}
                    tone="emerald"
                  />
                  <ModuleTile
                    selected={form.module === "writing"}
                    label="Writing"
                    icon={<PenLine size={18} />}
                    sub="Task 1 + 2"
                    onClick={() => setForm({ ...form, module: "writing", sectionTitleBase: "" })}
                    tone="violet"
                  />
                  <ModuleTile
                    selected={form.module === "speaking"}
                    label="Speaking"
                    icon={<Mic size={18} />}
                    sub="Part 1–3"
                    onClick={() => setForm({ ...form, module: "speaking", sectionTitleBase: "" })}
                    tone="rose"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <span className="text-gray-700">{moduleInfo.icon}</span>
                      {moduleInfo.label}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">{moduleInfo.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                    Fixed
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
                    <Type size={14} className="text-gray-400" />
                    Topic (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. climate, education, technology…"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className={INPUT}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700">Base section title (optional)</label>
                  <input
                    type="text"
                    placeholder={moduleInfo.baseTitlePlaceholder}
                    value={form.sectionTitleBase}
                    onChange={(e) => setForm({ ...form, sectionTitleBase: e.target.value })}
                    className={INPUT}
                  />
                  <p className="text-[11px] text-gray-600">Parts/passage numbers append automatically.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2">
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
                      Generating practice module…
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
                  Generates the full official module (Listening/Reading = 40 questions).
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
                  <BlueprintRow label={moduleInfo.label} value={moduleInfo.subtitle} />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Structure is locked to match the official IELTS module format.
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

function ModuleTile(input: {
  selected: boolean;
  label: string;
  sub: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone: "blue" | "emerald" | "violet" | "rose";
}) {
  const tone = {
    blue: { sel: "border-blue-600 bg-blue-50/70", icon: "text-blue-700" },
    emerald: { sel: "border-emerald-600 bg-emerald-50/70", icon: "text-emerald-700" },
    violet: { sel: "border-violet-600 bg-violet-50/70", icon: "text-violet-700" },
    rose: { sel: "border-rose-600 bg-rose-50/70", icon: "text-rose-700" },
  }[input.tone];

  return (
    <button
      type="button"
      onClick={input.onClick}
      className={`rounded-2xl border-2 p-4 text-left transition-colors ${
        input.selected ? tone.sel : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className={`w-10 h-10 rounded-2xl border border-gray-200 bg-white flex items-center justify-center ${tone.icon}`}>
        {input.icon}
      </div>
      <p className="mt-3 text-sm font-extrabold text-gray-900">{input.label}</p>
      <p className="mt-1 text-[11px] text-gray-600">{input.sub}</p>
    </button>
  );
}
