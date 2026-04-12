"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Save, Trash2, Upload,
  ChevronDown, ChevronUp, Mic, FileText, BookOpen, Headphones, PenLine,
  CheckCircle, FileEdit, FolderPlus, Layers, RefreshCw, Edit2, X, FileUp, Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";

/* ─── Types ───────────────────────────────────────────── */
interface Test {
  _id: string; title: string; description?: string; examType: string;
  module: string; accessLevel: string; duration: number; totalQuestions: number;
  status: string; difficulty?: string; instructions?: string;
}

interface Section {
  _id: string; testId: string; title: string; order: number;
  sectionType: string; instructions?: string; audioUrl?: string;
  passageText?: string; totalQuestions: number;
}

interface QuestionGroup {
  _id: string; sectionId: string; title?: string; questionType: string;
  order: number; questionNumberStart: number; questionNumberEnd: number;
  instructions?: string;
}

interface Question {
  _id: string; questionNumber: number; questionText: string;
  questionType: string; options?: { label: string; text: string }[];
  correctAnswer?: string; explanation?: string; marks: number;
  order: number; groupId: string; sectionId: string;
}

/* ─── Helpers ─────────────────────────────────────────── */
const MODULE_ICONS: Record<string, React.ReactNode> = {
  listening: <Headphones size={16} />,
  reading:   <BookOpen   size={16} />,
  writing:   <PenLine    size={16} />,
  speaking:  <Mic        size={16} />,
  full:      <FileText   size={16} />,
};

const QUESTION_TYPES = [
  { value: "multiple_choice",      label: "Multiple Choice" },
  { value: "true_false_not_given", label: "True / False / Not Given" },
  { value: "yes_no_not_given",     label: "Yes / No / Not Given" },
  { value: "fill_blank",           label: "Fill in the Blank" },
  { value: "matching",             label: "Matching" },
  { value: "sentence_completion",  label: "Sentence Completion" },
  { value: "short_answer",         label: "Short Answer" },
  { value: "essay",                label: "Essay / Writing Task" },
  { value: "speaking",             label: "Speaking" },
] as const;

function questionTypeSupportedByAiModal(t: string | undefined): t is string {
  if (!t) return false;
  return QUESTION_TYPES.some((qt) => qt.value === t);
}

const INPUT    = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const TEXTAREA = `${INPUT} resize-none`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalWrapper({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-h-[92vh] overflow-y-auto ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} title="Close" className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={18}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose}
        className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
        Cancel
      </button>
      <button type="submit" disabled={saving}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
        <Save size={14}/>
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function AdminTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [test,     setTest]     = useState<Test | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // per-section data cache { sectionId -> { groups, questions, loaded } }
  const [sectionData, setSectionData] = useState<
    Record<string, { groups: QuestionGroup[]; questions: Question[]; loaded: boolean }>
  >({});

  // modal state
  const [showAddSection,  setShowAddSection]  = useState(false);
  const [addGroupFor,     setAddGroupFor]     = useState<string | null>(null);
  const [addQuestionFor,  setAddQuestionFor]  = useState<{ sectionId: string; groupId: string } | null>(null);
  const [bulkUploadFor,   setBulkUploadFor]   = useState<string | null>(null);
  const [editSection,     setEditSection]     = useState<Section | null>(null);
  const [aiGenerateFor, setAiGenerateFor] = useState<{
    sectionId: string;
    groupId: string;
    startQuestionNumber: number;
    suggestedQuestionType?: string;
  } | null>(null);

  /* ── fetch test + sections ───────────────────────── */
  const fetchTestAndSections = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/tests/${id}`);
      const data = await res.json();
      setTest(data.test);
      const fetchedSections: Section[] = data.sections || [];
      setSections(fetchedSections);
      // Auto-expand first section and pre-load its data
      if (fetchedSections.length > 0) {
        const firstId = fetchedSections[0]._id;
        setExpandedSection((prev) => prev ?? firstId);
        // pre-load all sections data
        fetchedSections.forEach((s) => {
          setSectionData((prev) => {
            if (prev[s._id]?.loaded) return prev;
            return prev;
          });
        });
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTestAndSections(); }, [fetchTestAndSections]);

  // Auto-load section data whenever sections list changes
  useEffect(() => {
    sections.forEach((s) => {
      if (!sectionData[s._id]?.loaded) {
        loadSectionData(s._id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  /* ── load one section's groups + questions ──────── */
  const loadSectionData = useCallback(async (sectionId: string) => {
    const [grpRes, qRes] = await Promise.all([
      fetch(`/api/admin/question-groups?sectionId=${sectionId}`),
      fetch(`/api/admin/questions?sectionId=${sectionId}`),
    ]);
    const groups    = await grpRes.json();
    const questions = await qRes.json();
    setSectionData((prev) => ({
      ...prev,
      [sectionId]: {
        groups:    Array.isArray(groups)    ? groups    : [],
        questions: Array.isArray(questions) ? questions : [],
        loaded: true,
      },
    }));
  }, []);

  /**
   * Open AI question modal. Uses API (not client cache) so it works right after page load.
   * @param sectionId — optional; defaults to first section (top-bar shortcut).
   * @param preferredGroupId — optional; defaults to first group in that section.
   */
  const openAiGenerateModal = useCallback(
    async (sectionId?: string, preferredGroupId?: string) => {
      const section =
        sectionId != null
          ? sections.find((s) => s._id === sectionId)
          : sections[0];
      if (!section) {
        await Swal.fire(
          "Add a Section First",
          "Please add a section before generating questions.",
          "info"
        );
        return;
      }
      try {
        const [grpRes, qRes] = await Promise.all([
          fetch(`/api/admin/question-groups?sectionId=${section._id}`),
          fetch(`/api/admin/questions?sectionId=${section._id}`),
        ]);
        const groups = await grpRes.json();
        const questions = await qRes.json();
        const groupList = Array.isArray(groups) ? groups : [];
        if (groupList.length === 0) {
          await Swal.fire(
            "Add a Group First",
            "Add a question group in this section (Add Group), then use Generate with AI.",
            "info"
          );
          return;
        }
        const chosen =
          preferredGroupId != null
            ? groupList.find((g) => g._id === preferredGroupId)
            : undefined;
        const targetGroup = chosen ?? groupList[0];
        const qList = Array.isArray(questions) ? questions : [];
        const nums = qList
          .map((q) => Number(q.questionNumber) || 0)
          .filter((n) => n > 0);
        const startQuestionNumber = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        setAiGenerateFor({
          sectionId: section._id,
          groupId: targetGroup._id,
          startQuestionNumber,
          suggestedQuestionType: questionTypeSupportedByAiModal(
            targetGroup.questionType
          )
            ? targetGroup.questionType
            : undefined,
        });
      } catch {
        await Swal.fire(
          "Error",
          "Could not load groups for this section. Refresh the page and try again.",
          "error"
        );
      }
    },
    [sections]
  );

  /* ── expand / collapse ──────────────────────────── */
  const toggleSection = (sectionId: string) => {
    if (expandedSection === sectionId) { setExpandedSection(null); return; }
    setExpandedSection(sectionId);
    if (!sectionData[sectionId]?.loaded) loadSectionData(sectionId);
  };

  /* ── publish toggle ─────────────────────────────── */
  const handlePublishToggle = async () => {
    if (!test) return;
    const newStatus = test.status === "published" ? "draft" : "published";
    if (newStatus === "published" && test.totalQuestions === 0) {
      Swal.fire("Cannot Publish", "Add at least one question first.", "warning"); return;
    }
    const confirm = await Swal.fire({
      title: newStatus === "published" ? "Publish test?" : "Set to Draft?",
      icon: "question", showCancelButton: true,
      confirmButtonColor: newStatus === "published" ? "#16a34a" : "#d97706",
    });
    if (!confirm.isConfirmed) return;
    const res = await fetch(`/api/admin/tests/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTest(await res.json());
  };

  /* ── delete section ─────────────────────────────── */
  const handleDeleteSection = async (sectionId: string) => {
    const confirm = await Swal.fire({
      title: "Delete Section?", text: "All questions in this section will also be removed.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    await fetch(`/api/admin/sections/${sectionId}`, { method: "DELETE" });
    fetchTestAndSections();
    setSectionData((prev) => { const c = { ...prev }; delete c[sectionId]; return c; });
    if (expandedSection === sectionId) setExpandedSection(null);
  };

  /* ── delete question ────────────────────────────── */
  const handleDeleteQuestion = async (question: Question) => {
    const confirm = await Swal.fire({
      title: "Delete Question?", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    await fetch(`/api/admin/questions/${question._id}`, { method: "DELETE" });
    loadSectionData(question.sectionId);
    fetchTestAndSections();
  };

  /* ── delete group ───────────────────────────────── */
  const handleDeleteGroup = async (group: QuestionGroup) => {
    const confirm = await Swal.fire({
      title: "Delete Question Group?", text: "All questions in this group will also be deleted.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    await fetch(`/api/admin/question-groups/${group._id}`, { method: "DELETE" });
    loadSectionData(group.sectionId);
    fetchTestAndSections();
  };

  /* ─────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!test) return <p className="text-gray-500">Test not found.</p>;

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button title="Go back" onClick={() => router.back()} className="hover:text-gray-700">
          <ArrowLeft size={16}/>
        </button>
        <span>/</span>
        <Link href={`/dashboard/admin/${test.examType}-tests`} className="hover:text-gray-700 capitalize">
          {test.examType} Tests
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{test.title}</span>
      </div>

      {/* Test Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500">{MODULE_ICONS[test.module]}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                test.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}>{test.status}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                {test.examType}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
            {test.description && <p className="text-sm text-gray-500 mt-1">{test.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span>📚 {test.totalQuestions} questions</span>
              <span>⏱ {test.duration ? `${test.duration} min` : "No timer"}</span>
              <span className="capitalize">🎯 {test.module}</span>
              <span className="capitalize">🔐 {test.accessLevel}</span>
              {test.difficulty && <span className="capitalize">💪 {test.difficulty}</span>}
            </div>
          </div>
          <button onClick={handlePublishToggle}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              test.status === "published"
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}>
            {test.status === "published"
              ? <><FileEdit size={15}/> Set Draft</>
              : <><CheckCircle size={15}/> Publish</>}
          </button>
        </div>
      </div>

      {/* ── Quick Action Bar (always visible) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setShowAddSection(true)}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
            <Plus size={20} className="text-blue-600"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Add Section</p>
            <p className="text-xs text-gray-400">Listening / Reading…</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (sections.length === 0) {
              Swal.fire("Add a Section First", "Please add at least one section before creating a question group.", "info");
              return;
            }
            setAddGroupFor(sections[0]._id);
          }}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center transition-colors">
            <FolderPlus size={20} className="text-indigo-600"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Add Question Group</p>
            <p className="text-xs text-gray-400">Set type & Q# range</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (sections.length === 0) {
              Swal.fire("Add a Section First", "Please add a section and a question group before uploading.", "info");
              return;
            }
            setBulkUploadFor(sections[0]._id);
          }}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-xl flex items-center justify-center transition-colors">
            <FileUp size={20} className="text-purple-600"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Bulk Upload</p>
            <p className="text-xs text-gray-400">.xlsx · .docx · .pdf · .json</p>
          </div>
        </button>

        <button
          onClick={() => {
            const firstGroup = Object.values(sectionData).flatMap((sd) => sd.groups)[0];
            const firstSection = sections[0];
            if (!firstSection) {
              Swal.fire("Add a Section First", "Please add a section before adding questions.", "info");
              return;
            }
            if (!firstGroup) {
              Swal.fire("Add a Group First", "Please add a question group in the section before adding a single question.", "info");
              return;
            }
            setAddQuestionFor({ sectionId: firstSection._id, groupId: firstGroup._id });
          }}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center transition-colors">
            <PenLine size={20} className="text-green-600"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Add Question</p>
            <p className="text-xs text-gray-400">Single question form</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => void openAiGenerateModal()}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-dashed border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors group"
        >
          <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors">
            <Sparkles size={20} className="text-amber-600"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Generate with AI</p>
            <p className="text-xs text-gray-400">Auto-create questions</p>
          </div>
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Sections <span className="text-gray-400 font-normal text-sm">({sections.length})</span>
          </h2>
          <button onClick={() => setShowAddSection(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus size={16}/> Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Step guide */}
            <div className="p-6 text-center border-b border-gray-100">
              <FileText size={36} className="mx-auto mb-3 text-blue-300"/>
              <h3 className="text-base font-semibold text-gray-800 mb-1">No sections yet</h3>
              <p className="text-sm text-gray-500">Follow the steps below to add questions to this test.</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { step: "1", icon: "📂", title: "Add Section", desc: 'Click "Add Section" above. Choose type: Listening, Reading, Writing or Speaking.' },
                  { step: "2", icon: "🗂️", title: "Add Question Group", desc: 'Expand the section → click "Add Group". Set question type and number range.' },
                  { step: "3", icon: "📤", title: "Questions", desc: 'Use "Bulk Upload" (.xlsx, .docx, .pdf, .json), "Generate with AI" inside the section, or add questions one by one.' },
                  { step: "4", icon: "✅", title: "Publish", desc: 'Once questions are added, click "Publish" to make the test visible to students.' },
                ].map(({ step, icon, title, desc }) => (
                  <div key={step} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl gap-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {step}
                    </div>
                    <span className="text-2xl">{icon}</span>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowAddSection(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Plus size={16}/> Add First Section
                </button>
              </div>
            </div>
          </div>
        ) : (
          sections.map((section) => {
            const isExpanded = expandedSection === section._id;
            const sd = sectionData[section._id];

            return (
              <div key={section._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Section Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection(section._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">
                      {section.order}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {section.sectionType.replace(/_/g, " ")}
                        {section.audioUrl && " · 🎵 Audio"}
                        {section.passageText && " · 📄 Passage"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-gray-500">{section.totalQuestions} Qs</span>
                    <button title="Edit section" onClick={() => setEditSection(section)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                      <Edit2 size={14}/>
                    </button>
                    <button title="Delete section" onClick={() => handleDeleteSection(section._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14}/>
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                  </div>
                </div>

                {/* Section Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-5">

                    {/* Listening audio */}
                    {section.sectionType === "listening_part" && (
                      <AudioUploader sectionId={section._id} currentUrl={section.audioUrl} onUploaded={fetchTestAndSections}/>
                    )}

                    {/* Reading passage preview */}
                    {section.sectionType === "reading_passage" && section.passageText && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-700 mb-1">Reading Passage (preview)</p>
                        <p className="text-sm text-gray-700 line-clamp-4">{section.passageText}</p>
                        <button onClick={() => setEditSection(section)} className="mt-2 text-xs text-amber-700 hover:underline">
                          Edit full passage →
                        </button>
                      </div>
                    )}

                    {/* Loading */}
                    {!sd?.loaded && (
                      <div className="flex items-center justify-center py-6">
                        <RefreshCw size={18} className="animate-spin text-blue-500"/>
                      </div>
                    )}

                    {/* Question Groups */}
                    {sd?.loaded && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                            <Layers size={14}/> Question Groups ({sd.groups.length})
                          </p>
                          <div className="flex flex-wrap items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => void openAiGenerateModal(section._id)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 border border-amber-200/80"
                            >
                              <Sparkles size={12} /> Generate with AI
                            </button>
                            <button onClick={() => setBulkUploadFor(section._id)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                              <FileUp size={12}/> Bulk Upload
                            </button>
                            <button onClick={() => setAddGroupFor(section._id)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                              <FolderPlus size={12}/> Add Group
                            </button>
                          </div>
                        </div>

                        {sd.groups.length === 0 ? (
                          <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-xs space-y-2">
                            <p>
                              No question groups yet.{" "}
                              <button onClick={() => setAddGroupFor(section._id)} className="text-blue-500 hover:underline">
                                Create one →
                              </button>
                            </p>
                            <p className="text-gray-500">
                              After a group exists, use{" "}
                              <span className="font-medium text-amber-700">Generate with AI</span>{" "}
                              above to auto-create questions.
                            </p>
                          </div>
                        ) : (
                          sd.groups.map((group) => {
                            const groupQs = sd.questions.filter((q) => q.groupId === group._id);
                            return (
                              <div key={group._id} className="border border-gray-100 rounded-xl overflow-hidden">
                                {/* Group header */}
                                <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">
                                      {group.title || `Group ${group.order}`}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-400 capitalize">
                                      {group.questionType.replace(/_/g, " ")}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-400">
                                      Q{group.questionNumberStart}–{group.questionNumberEnd}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void openAiGenerateModal(section._id, group._id)
                                      }
                                      title="Generate questions with AI into this group"
                                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 border border-amber-200/80"
                                    >
                                      <Sparkles size={11} /> AI
                                    </button>
                                    <button
                                      onClick={() => setAddQuestionFor({ sectionId: section._id, groupId: group._id })}
                                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                      <Plus size={11}/> Add Q
                                    </button>
                                    <button onClick={() => handleDeleteGroup(group)} title="Delete group"
                                      className="p-1 text-gray-400 hover:text-red-500">
                                      <Trash2 size={13}/>
                                    </button>
                                  </div>
                                </div>

                                {/* Questions */}
                                {groupQs.length === 0 ? (
                                  <div className="text-center py-4 px-3 space-y-2">
                                    <p className="text-xs text-gray-400">No questions in this group.</p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void openAiGenerateModal(section._id, group._id)
                                      }
                                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                                    >
                                      <Sparkles size={12} /> Generate with AI
                                    </button>
                                  </div>
                                ) : (
                                  <div className="divide-y divide-gray-50">
                                    {groupQs.map((q) => (
                                      <div key={q._id} className="flex items-start justify-between px-4 py-3 gap-3">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium text-blue-600 mr-2">Q{q.questionNumber}</span>
                                          <span className="text-sm text-gray-800">{q.questionText}</span>
                                          <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs text-gray-400 capitalize">{q.questionType.replace(/_/g, " ")}</span>
                                            <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                                            {q.correctAnswer && (
                                              <span className="text-xs text-green-600 font-medium">✓ {q.correctAnswer}</span>
                                            )}
                                          </div>
                                        </div>
                                        <button onClick={() => handleDeleteQuestion(q)} title="Delete question"
                                          className="p-1 text-gray-400 hover:text-red-500 shrink-0">
                                          <Trash2 size={13}/>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      {showAddSection && (
        <AddSectionModal
          testId={id} nextOrder={sections.length + 1} module={test.module}
          onClose={() => setShowAddSection(false)}
          onSuccess={() => { setShowAddSection(false); fetchTestAndSections(); }}
        />
      )}
      {editSection && (
        <EditSectionModal
          section={editSection}
          onClose={() => setEditSection(null)}
          onSuccess={() => { setEditSection(null); fetchTestAndSections(); }}
        />
      )}
      {addGroupFor && (
        <AddGroupModal
          testId={id} sectionId={addGroupFor}
          nextOrder={(sectionData[addGroupFor]?.groups.length ?? 0) + 1}
          onClose={() => setAddGroupFor(null)}
          onSuccess={() => { const s = addGroupFor; setAddGroupFor(null); loadSectionData(s); }}
        />
      )}
      {addQuestionFor && (
        <AddQuestionModal
          testId={id}
          sectionId={addQuestionFor.sectionId}
          groupId={addQuestionFor.groupId}
          nextNumber={(sectionData[addQuestionFor.sectionId]?.questions.length ?? 0) + 1}
          onClose={() => setAddQuestionFor(null)}
          onSuccess={() => {
            const s = addQuestionFor.sectionId;
            setAddQuestionFor(null);
            loadSectionData(s);
            fetchTestAndSections();
          }}
        />
      )}
      {bulkUploadFor && (
        <BulkUploadModal
          testId={id} sectionId={bulkUploadFor}
          groups={sectionData[bulkUploadFor]?.groups ?? []}
          onClose={() => setBulkUploadFor(null)}
          onSuccess={() => {
            const s = bulkUploadFor;
            setBulkUploadFor(null);
            loadSectionData(s);
            fetchTestAndSections();
          }}
        />
      )}
      {aiGenerateFor && test && (
        <AIGenerateModal
          key={`${aiGenerateFor.sectionId}-${aiGenerateFor.groupId}`}
          testId={id}
          sections={sections}
          initialSectionId={aiGenerateFor.sectionId}
          initialGroupId={aiGenerateFor.groupId}
          initialStartQuestionNumber={aiGenerateFor.startQuestionNumber}
          suggestedQuestionType={aiGenerateFor.suggestedQuestionType}
          testModule={test.module}
          defaultTopic={test.title}
          onClose={() => setAiGenerateFor(null)}
          onSuccess={(sectionId) => {
            setAiGenerateFor(null);
            loadSectionData(sectionId);
            fetchTestAndSections();
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AUDIO UPLOADER
═══════════════════════════════════════════════════════ */
function AudioUploader({ sectionId, currentUrl, onUploaded }: {
  sectionId: string; currentUrl?: string; onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch(`/api/admin/sections/${sectionId}`, { method: "PATCH", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      Swal.fire("Uploaded!", "Audio uploaded successfully.", "success");
      onUploaded();
    } catch { Swal.fire("Error", "Audio upload failed", "error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
      <Headphones size={18} className="text-blue-600 shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">Listening Audio</p>
        {currentUrl ? (
          <audio controls src={currentUrl} className="mt-1 h-8 w-full max-w-xs">
            <track kind="captions"/>
          </audio>
        ) : (
          <p className="text-xs text-blue-600">No audio uploaded yet</p>
        )}
      </div>
      <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
        <Upload size={12}/>
        {uploading ? "Uploading…" : currentUrl ? "Replace" : "Upload"}
        <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} disabled={uploading}/>
      </label>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD SECTION MODAL
═══════════════════════════════════════════════════════ */
function AddSectionModal({ testId, nextOrder, module: testModule, onClose, onSuccess }: {
  testId: string; nextOrder: number; module: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const defaultType =
    testModule === "listening" ? "listening_part"
    : testModule === "reading"  ? "reading_passage"
    : testModule === "writing"  ? "writing_task"
    : "speaking_part";

  const [form, setForm] = useState({
    title: "", sectionType: defaultType, order: nextOrder,
    instructions: "", passageText: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, testId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onSuccess();
    } catch (err: any) { Swal.fire("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title="Add Section" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Title *">
          <input required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Part 1 – Conversation" className={INPUT}/>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Section Type">
            <select aria-label="Section Type" value={form.sectionType}
              onChange={(e) => setForm({ ...form, sectionType: e.target.value })} className={INPUT}>
              <option value="listening_part">Listening Part</option>
              <option value="reading_passage">Reading Passage</option>
              <option value="writing_task">Writing Task</option>
              <option value="speaking_part">Speaking Part</option>
            </select>
          </Field>
          <Field label="Order">
            <input aria-label="Order" type="number" min={1} value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className={INPUT}/>
          </Field>
        </div>
        <Field label="Instructions">
          <textarea aria-label="Instructions" value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={2} placeholder="Section-level instructions…" className={TEXTAREA}/>
        </Field>
        {form.sectionType === "reading_passage" && (
          <Field label="Passage Text">
            <textarea aria-label="Passage Text" value={form.passageText}
              onChange={(e) => setForm({ ...form, passageText: e.target.value })}
              rows={8} placeholder="Paste the reading passage here…" className={TEXTAREA}/>
          </Field>
        )}
        <ModalFooter onClose={onClose} saving={saving} label="Add Section"/>
      </form>
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════════════════════
   EDIT SECTION MODAL
═══════════════════════════════════════════════════════ */
function EditSectionModal({ section, onClose, onSuccess }: {
  section: Section; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: section.title,
    instructions: section.instructions || "",
    passageText: section.passageText || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/admin/sections/${section._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      Swal.fire("Saved!", "Section updated.", "success");
      onSuccess();
    } catch (err: any) { Swal.fire("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title={`Edit: ${section.title}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Title *">
          <input required aria-label="Section Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT}/>
        </Field>
        <Field label="Instructions">
          <textarea value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={3} placeholder="Section instructions…" className={TEXTAREA}/>
        </Field>
        {section.sectionType === "reading_passage" && (
          <Field label="Passage Text (full)">
            <textarea value={form.passageText}
              onChange={(e) => setForm({ ...form, passageText: e.target.value })}
              rows={14} placeholder="Full reading passage…" className={TEXTAREA}/>
          </Field>
        )}
        <ModalFooter onClose={onClose} saving={saving} label="Save Changes"/>
      </form>
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD QUESTION GROUP MODAL
═══════════════════════════════════════════════════════ */
function AddGroupModal({ testId, sectionId, nextOrder, onClose, onSuccess }: {
  testId: string; sectionId: string; nextOrder: number;
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "", questionType: "multiple_choice", order: nextOrder,
    questionNumberStart: 1, questionNumberEnd: 5, instructions: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/admin/question-groups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sectionId, testId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onSuccess();
    } catch (err: any) { Swal.fire("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title="Add Question Group" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Group Title (optional)">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Questions 1–5 · Conversation" className={INPUT}/>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Question Type *">
            <select aria-label="Question Type" value={form.questionType}
              onChange={(e) => setForm({ ...form, questionType: e.target.value })} className={INPUT}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Group Order">
            <input aria-label="Order" type="number" min={1} value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className={INPUT}/>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Question # Start">
            <input aria-label="Q Start" type="number" min={1} value={form.questionNumberStart}
              onChange={(e) => setForm({ ...form, questionNumberStart: Number(e.target.value) })} className={INPUT}/>
          </Field>
          <Field label="Question # End">
            <input aria-label="Q End" type="number" min={1} value={form.questionNumberEnd}
              onChange={(e) => setForm({ ...form, questionNumberEnd: Number(e.target.value) })} className={INPUT}/>
          </Field>
        </div>
        <Field label="Group Instructions">
          <textarea value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={3} placeholder="Instructions shown above this group of questions…" className={TEXTAREA}/>
        </Field>
        <ModalFooter onClose={onClose} saving={saving} label="Create Group"/>
      </form>
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD QUESTION MODAL
═══════════════════════════════════════════════════════ */
function AddQuestionModal({ testId, sectionId, groupId, nextNumber, onClose, onSuccess }: {
  testId: string; sectionId: string; groupId: string; nextNumber: number;
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    questionNumber: nextNumber, questionText: "", questionType: "multiple_choice",
    marks: 1, order: nextNumber, correctAnswer: "", explanation: "",
    optionA: "", optionB: "", optionC: "", optionD: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const options =
      form.questionType === "multiple_choice"
        ? [
            { label: "A", text: form.optionA },
            { label: "B", text: form.optionB },
            { label: "C", text: form.optionC },
            { label: "D", text: form.optionD },
          ].filter((o) => o.text)
        : undefined;
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId, sectionId, groupId,
          questionNumber: form.questionNumber, questionText: form.questionText,
          questionType: form.questionType, options,
          correctAnswer: form.correctAnswer, explanation: form.explanation,
          marks: form.marks, order: form.order,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onSuccess();
    } catch (err: any) { Swal.fire("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <ModalWrapper title="Add Question" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Question #">
            <input aria-label="Question Number" type="number" min={1} value={form.questionNumber}
              onChange={(e) => setForm({ ...form, questionNumber: Number(e.target.value) })} className={INPUT}/>
          </Field>
          <Field label="Type">
            <select aria-label="Question Type" value={form.questionType}
              onChange={(e) => setForm({ ...form, questionType: e.target.value })} className={INPUT}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Question Text *">
          <textarea required value={form.questionText}
            onChange={(e) => setForm({ ...form, questionText: e.target.value })}
            rows={3} placeholder="Enter the question…" className={TEXTAREA}/>
        </Field>
        {form.questionType === "multiple_choice" && (
          <div className="grid grid-cols-2 gap-3">
            {(["A","B","C","D"] as const).map((l) => (
              <Field key={l} label={`Option ${l}`}>
                <input value={form[`option${l}` as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [`option${l}`]: e.target.value })}
                  placeholder={`Option ${l}`} className={INPUT}/>
              </Field>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Correct Answer">
            <input value={form.correctAnswer}
              onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
              placeholder={form.questionType === "multiple_choice" ? "A, B, C or D" : "Answer text"}
              className={INPUT}/>
          </Field>
          <Field label="Marks">
            <input aria-label="Marks" type="number" min={1} value={form.marks}
              onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} className={INPUT}/>
          </Field>
        </div>
        <Field label="Explanation (shown after submit)">
          <textarea value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            rows={2} placeholder="Why is this the correct answer…" className={TEXTAREA}/>
        </Field>
        <ModalFooter onClose={onClose} saving={saving} label="Add Question"/>
      </form>
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════════════════════
   BULK UPLOAD MODAL
   Supports: .xlsx  .xls  .docx  .pdf  .json
═══════════════════════════════════════════════════════ */
function BulkUploadModal({ testId, sectionId, groups, onClose, onSuccess }: {
  testId: string; sectionId: string; groups: QuestionGroup[];
  onClose: () => void; onSuccess: () => void;
}) {
  const [groupId, setGroupId]   = useState(groups[0]?._id ?? "");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f); setPreview(null);
    if (f && (f.name.endsWith(".json") || f.type.includes("json"))) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const arr = Array.isArray(parsed) ? parsed : parsed.questions;
          setPreview(`${arr.length} questions detected in JSON`);
        } catch { setPreview("Invalid JSON"); }
      };
      reader.readAsText(f);
    }
  };

  const handleUpload = async () => {
    if (!file) { Swal.fire("No file", "Please select a file first.", "warning"); return; }
    if (!groupId) { Swal.fire("No Group", "Please select a question group.", "warning"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file",      file);
      fd.append("testId",    testId);
      fd.append("sectionId", sectionId);
      fd.append("groupId",   groupId);
      const res  = await fetch("/api/admin/questions", { method: "PUT", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      Swal.fire("Uploaded!", `${data.count} questions imported.`, "success");
      onSuccess();
    } catch (err: any) { Swal.fire("Error", err.message, "error"); }
    finally { setUploading(false); }
  };

  return (
    <ModalWrapper title="Bulk Upload Questions" onClose={onClose} wide>
      <div className="p-6 space-y-5">

        {/* Format guide */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-3">
          <p className="font-semibold text-sm text-blue-900">📁 Supported formats</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-medium">📊 Excel (.xlsx / .xls)</p>
              <p className="text-blue-600 leading-relaxed">
                Columns: <code>questionNumber, questionText, questionType, options</code> (JSON string),
                <code> correctAnswer, explanation, marks, order</code>
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">📝 Word (.docx) / 📄 PDF</p>
              <p className="text-blue-600 leading-relaxed font-mono">
                1. Question text?<br/>
                A. Option A<br/>
                B. Option B<br/>
                Answer: A<br/>
                Explanation: ...
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">🔧 JSON (.json)</p>
              <p className="text-blue-600 leading-relaxed">
                Array of objects with same fields as Excel columns.
              </p>
            </div>
            <div className="space-y-1 bg-blue-100/50 rounded-lg p-2">
              <p className="font-medium">💡 Tip</p>
              <p className="text-blue-700">
                For Excel/JSON, <code>testId</code>, <code>sectionId</code>, <code>groupId</code> fields
                are filled automatically from your selection above.
              </p>
            </div>
          </div>
        </div>

        {/* Group selector */}
        {groups.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠️ No question groups for this section. Close and create a group first.
          </div>
        ) : (
          <Field label="Target Question Group *">
            <select aria-label="Question Group" value={groupId}
              onChange={(e) => setGroupId(e.target.value)} className={INPUT}>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.title || `Group ${g.order}`} — {g.questionType.replace(/_/g," ")} · Q{g.questionNumberStart}–{g.questionNumberEnd}
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* File picker */}
        <Field label="File *">
          <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50 transition-colors">
            <FileUp size={24} className="text-gray-400 shrink-0"/>
            <div className="flex-1 min-w-0">
              {file ? (
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              ) : (
                <p className="text-sm text-gray-400">Click to choose file</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">.xlsx · .docx · .pdf · .json</p>
              {preview && <p className="text-xs text-green-600 mt-0.5 font-medium">{preview}</p>}
            </div>
            {file && (
              <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null); }}
                className="p-1 text-gray-400 hover:text-red-500">
                <X size={16}/>
              </button>
            )}
            <input type="file" accept=".xlsx,.xls,.docx,.doc,.pdf,.json" className="hidden" onChange={handleFileChange}/>
          </label>
        </Field>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleUpload}
            disabled={uploading || !file || groups.length === 0}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <FileUp size={15}/>
            {uploading ? "Uploading…" : "Upload Questions"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ═══════════════════════════════════════════════════════
   AI GENERATE MODAL
═══════════════════════════════════════════════════════ */
function AIGenerateModal({
  testId,
  sections,
  initialSectionId,
  initialGroupId,
  initialStartQuestionNumber,
  suggestedQuestionType,
  testModule,
  defaultTopic,
  onClose,
  onSuccess,
}: {
  testId: string;
  sections: Section[];
  initialSectionId: string;
  initialGroupId: string;
  initialStartQuestionNumber: number;
  suggestedQuestionType?: string;
  testModule: string;
  defaultTopic?: string;
  onClose: () => void;
  onSuccess: (sectionId: string) => void;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loadingPlacement, setLoadingPlacement] = useState(true);
  const [nextQuestionStart, setNextQuestionStart] = useState(
    initialStartQuestionNumber
  );

  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [generateWarnings, setGenerateWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const refreshPlacement = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoadingPlacement(true);
    try {
      const [grpRes, qRes] = await Promise.all([
        fetch(`/api/admin/question-groups?sectionId=${sid}`),
        fetch(`/api/admin/questions?sectionId=${sid}`),
      ]);
      const rawGroups = await grpRes.json();
      const rawQs = await qRes.json();
      const groupList = Array.isArray(rawGroups) ? rawGroups : [];
      const qList = Array.isArray(rawQs) ? rawQs : [];
      setGroups(groupList);
      setSelectedGroupId((prev) => {
        if (prev && groupList.some((g) => g._id === prev)) return prev;
        return groupList[0]?._id ?? "";
      });
      const nums = qList
        .map((q) => Number(q.questionNumber) || 0)
        .filter((n) => n > 0);
      setNextQuestionStart(nums.length > 0 ? Math.max(...nums) + 1 : 1);
    } catch {
      setGroups([]);
      setSelectedGroupId("");
      setNextQuestionStart(1);
    } finally {
      setLoadingPlacement(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSectionId) void refreshPlacement(selectedSectionId);
  }, [selectedSectionId, refreshPlacement]);

  useEffect(() => {
    setTopic(defaultTopic ?? "");
  }, [defaultTopic]);

  useEffect(() => {
    setGenerated([]);
    setGenerateWarnings([]);
  }, [selectedSectionId, selectedGroupId]);

  useEffect(() => {
    const g = groups.find((x) => x._id === selectedGroupId);
    if (g && questionTypeSupportedByAiModal(g.questionType)) {
      setQuestionType(g.questionType);
    } else if (
      suggestedQuestionType &&
      questionTypeSupportedByAiModal(suggestedQuestionType)
    ) {
      setQuestionType(suggestedQuestionType);
    }
  }, [selectedGroupId, groups, suggestedQuestionType]);

  const selectedSection = sections.find((s) => s._id === selectedSectionId);
  const selectedGroup = groups.find((g) => g._id === selectedGroupId);
  const placementReady =
    Boolean(selectedSectionId) &&
    Boolean(selectedGroupId) &&
    groups.length > 0 &&
    !loadingPlacement;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Swal.fire("Topic Required", "Please enter a topic for AI to generate questions about.", "warning");
      return;
    }
    if (!placementReady) {
      Swal.fire(
        "Choose section & group",
        "Select a section that has at least one question group.",
        "warning"
      );
      return;
    }
    setGenerating(true);
    setGenerated([]);
    setGenerateWarnings([]);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: testModule,
          questionType,
          topic: topic.trim(),
          count,
          difficulty,
          testId,
          sectionId: selectedSectionId,
          groupId: selectedGroupId,
          startQuestionNumber: nextQuestionStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.message || "Generation failed"
        );
      }
      setGenerated(data.questions || []);
      const w = data.warnings;
      setGenerateWarnings(Array.isArray(w) ? w : []);
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "Failed to generate questions", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (generated.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: generated }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Save failed");
      }
      Swal.fire("Saved!", `${data.count ?? generated.length} questions saved successfully.`, "success");
      onSuccess(selectedSectionId);
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "Failed to save questions", "error");
    } finally {
      setSaving(false);
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <ModalWrapper title="✨ Generate Questions with AI" onClose={onClose} wide>
      <div className="p-6 space-y-5">
        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Layers size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Where to add questions
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Pick the section and question group below. Generated questions will be saved there.
                </p>
              </div>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-amber-900">
                No sections on this test. Add a section first, then open this modal again.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Section">
                  <select
                    aria-label="Section for generated questions"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className={INPUT}
                    disabled={sections.length === 0}
                  >
                    {sortedSections.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.order}. {s.title} ({s.sectionType.replace(/_/g, " ")})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Question group">
                  <select
                    aria-label="Question group for generated questions"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className={INPUT}
                    disabled={loadingPlacement || groups.length === 0}
                  >
                    {groups.length === 0 ? (
                      <option value="">No groups in this section</option>
                    ) : (
                      groups.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.title?.trim() || `Group ${g.order}`} · Q
                          {g.questionNumberStart}–{g.questionNumberEnd} ·{" "}
                          {g.questionType.replace(/_/g, " ")}
                        </option>
                      ))
                    )}
                  </select>
                </Field>
              </div>
            )}
            {loadingPlacement ? (
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                Loading groups for this section…
              </p>
            ) : (
              <div className="rounded-lg bg-white/80 border border-amber-100 px-3 py-2 text-xs text-gray-700 space-y-1">
                <p>
                  <span className="font-medium text-gray-500">Target:</span>{" "}
                  <span className="text-gray-900">
                    {selectedSection
                      ? `${selectedSection.order}. ${selectedSection.title}`
                      : "—"}
                  </span>
                  {" → "}
                  <span className="text-gray-900">
                    {selectedGroup
                      ? (selectedGroup.title?.trim() || `Group ${selectedGroup.order}`)
                      : "—"}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-500">Next question # in section:</span>{" "}
                  <span className="font-semibold tabular-nums text-amber-900">
                    {nextQuestionStart}
                  </span>
                  {groups.length === 0 && selectedSectionId && (
                    <span className="block mt-1 text-amber-800">
                      Add a question group to this section (Add Group), then pick it here.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Field label="Topic / Passage *">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Climate change effects on agriculture"
                className={INPUT}
                aria-label="Topic or passage for AI generation"
              />
            </Field>
            <p className="text-xs text-gray-500 mt-1">
              Question numbers will start at{" "}
              <span className="font-semibold text-gray-700 tabular-nums">
                {nextQuestionStart}
              </span>{" "}
              (after existing questions in this section).
            </p>
          </div>
          <Field label="Question Type">
            <select aria-label="Question Type" value={questionType} onChange={(e) => setQuestionType(e.target.value)} className={INPUT}>
              {QUESTION_TYPES.map((qt) => (
                <option key={qt.value} value={qt.value}>{qt.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Number of Questions (1–20)">
            <input
              type="number"
              min={1} max={20}
              value={count}
              aria-label="Number of Questions"
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className={INPUT}
            />
          </Field>
          <Field label="Difficulty">
            <select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={INPUT}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Module">
            <input type="text" value={testModule} readOnly className={`${INPUT} bg-gray-50 text-gray-500`}/>
          </Field>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !placementReady}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Sparkles size={16}/>
          {generating ? "Generating…" : "Generate Questions"}
        </button>

        {/* Preview */}
        {generating && (
          <div className="flex flex-col items-center gap-3 py-8 text-amber-600">
            <RefreshCw size={28} className="animate-spin"/>
            <p className="text-sm font-medium">AI is generating your questions…</p>
          </div>
        )}

        {!generating && generated.length > 0 && (
          <div className="space-y-3">
            {generateWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-100 border border-amber-200/80 px-3 py-2.5 text-xs text-amber-950">
                <p className="font-semibold mb-1">Review before saving</p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-900/95">
                  {generateWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                Preview — {generated.length} question{generated.length !== 1 ? "s" : ""} generated
              </p>
              <span className="text-xs text-gray-400">Review before saving</span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-10">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Question</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell w-32">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell w-28">Answer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generated.map((q, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 font-medium">{q.questionNumber ?? i + 1}</td>
                      <td className="px-3 py-2 text-gray-800">{q.questionText}</td>
                      <td className="px-3 py-2 text-gray-500 capitalize hidden sm:table-cell text-xs">
                        {q.questionType?.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2 text-green-700 font-medium hidden sm:table-cell text-xs truncate max-w-27.5">
                        {q.correctAnswer ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={14}/>
                {saving ? "Saving…" : `Save All ${generated.length} Questions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
