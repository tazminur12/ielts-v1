"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Filter, FileText, Clock,
  CheckCircle, FileEdit, Trash2, Eye, Pencil, Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";

interface Test {
  _id: string;
  title: string;
  examType: "mock" | "practice";
  type?: string;
  module: string;
  accessLevel: string;
  duration: number;
  totalQuestions: number;
  status: "draft" | "published";
  difficulty?: string;
  tags?: string[];
  rating?: number;
  usersCount?: number;
  createdAt: string;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  isPremium: boolean;
  displayOrder: number;
}

const MODULE_COLORS: Record<string, string> = {
  listening: "bg-blue-100 text-blue-700",
  reading: "bg-green-100 text-green-700",
  writing: "bg-purple-100 text-purple-700",
  speaking: "bg-orange-100 text-orange-700",
};

function getAccessBadgeClass(slug: string, plans: Plan[]): string {
  const plan = plans.find((p) => p.slug === slug);
  if (!plan) return "bg-gray-100 text-gray-600";
  const palette = [
    "bg-emerald-100 text-emerald-700",
    "bg-yellow-100 text-yellow-700",
    "bg-pink-100 text-pink-700",
    "bg-violet-100 text-violet-700",
    "bg-cyan-100 text-cyan-700",
  ];
  return palette[plan.displayOrder % palette.length] ?? "bg-gray-100 text-gray-600";
}

function getPlanName(slug: string, plans: Plan[]): string {
  return plans.find((p) => p.slug === slug)?.name ?? slug;
}

export default function AdminPracticeTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);

  // Fetch plans once
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data || []))
      .catch(() => {});
  }, []);

  const fetchTests = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        examType: "practice",
        page: String(page),
        limit: "15",
      });
      if (moduleFilter) params.set("module", moduleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/tests?${params}`);
      const data = await res.json();
      setTests(data.tests || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1 });
    } catch {
      Swal.fire("Error", "Failed to load tests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, statusFilter]);

  const handleToggleStatus = async (test: Test) => {
    const newStatus = test.status === "published" ? "draft" : "published";
    const confirm = await Swal.fire({
      title: `${newStatus === "published" ? "Publish" : "Unpublish"} this test?`,
      text: `"${test.title}" will be ${newStatus === "published" ? "visible to students" : "hidden from students"}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus === "published" ? "#16a34a" : "#d97706",
      confirmButtonText: newStatus === "published" ? "Publish" : "Set to Draft",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/tests/${test._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const list = Array.isArray(data?.errors) ? data.errors : [];
        if (list.length > 0) {
          await Swal.fire({
            title: "Cannot Publish",
            html: `<div style="text-align:left">
              <p style="margin:0 0 8px 0">${data?.message || "IELTS parity validation failed"}:</p>
              <ul style="padding-left:18px;margin:0">${list.map((e: string) => `<li>${e}</li>`).join("")}</ul>
            </div>`,
            icon: "error",
            confirmButtonColor: "#dc2626",
          });
        } else {
          await Swal.fire("Error", data?.message || "Failed to update status.", "error");
        }
        return;
      }

      await Swal.fire(
        "Success",
        newStatus === "published" ? "Test published" : "Moved to draft",
        "success"
      );
      fetchTests(pagination.page);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to update status.", "error");
    }
  };

  const handleDelete = async (test: Test) => {
    const confirm = await Swal.fire({
      title: "Delete Test?",
      text: `This will permanently delete "${test.title}" and ALL its sections and questions.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete",
    });
    if (!confirm.isConfirmed) return;

    await fetch(`/api/admin/tests/${test._id}`, { method: "DELETE" });
    Swal.fire("Deleted!", "Test has been deleted.", "success");
    fetchTests(pagination.page);
  };

  const filtered = tests.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practice Tests</h1>
          <p className="text-gray-500 text-sm mt-1">
            Module-wise practice sets with instant feedback · {pagination.total} total
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/practice-tests/generate"
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            Create Practice Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search practice tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          aria-label="Filter by module"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Modules</option>
          <option value="listening">Listening</option>
          <option value="reading">Reading</option>
          <option value="writing">Writing</option>
          <option value="speaking">Speaking</option>
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button
          onClick={() => { setModuleFilter(""); setStatusFilter(""); setSearch(""); }}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Filter size={14} /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p>No practice tests found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-purple-600 text-sm hover:underline"
            >
              Create your first practice test →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Module</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Access</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Questions</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Timer</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((test) => (
                  <tr key={test._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{test.title}</div>
                      <div className="text-xs text-gray-400 capitalize mt-0.5">
                        {test.difficulty || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${MODULE_COLORS[test.module] || "bg-gray-100 text-gray-600"}`}>
                        {test.module}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getAccessBadgeClass(test.accessLevel, plans)}`}>
                        {getPlanName(test.accessLevel, plans)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{test.totalQuestions}</td>
                    <td className="px-4 py-4 text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" />
                        {test.duration ? `${test.duration} min` : "No timer"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        test.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {test.status === "published"
                          ? <CheckCircle size={11} />
                          : <FileEdit size={11} />}
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/tests/${test._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          title="Manage sections, bulk upload, and Generate with AI"
                        >
                          <Eye size={13} /> Manage
                        </Link>
                        <button
                          onClick={() => setEditingTest(test)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit Test"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(test)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            test.status === "published"
                              ? "text-yellow-500 hover:bg-yellow-50"
                              : "text-green-500 hover:bg-green-50"
                          }`}
                          title={test.status === "published" ? "Set Draft" : "Publish"}
                        >
                          {test.status === "published" ? <FileEdit size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(test)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} tests
            </p>
            <div className="flex gap-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchTests(p)}
                  className={`w-8 h-8 text-sm rounded-lg ${
                    p === pagination.page
                      ? "bg-purple-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreatePracticeTestModal
          plans={plans}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchTests(); }}
        />
      )}

      {/* Edit Modal */}
      {editingTest && (
        <EditTestModal
          test={editingTest}
          plans={plans}
          onClose={() => setEditingTest(null)}
          onSuccess={() => { setEditingTest(null); fetchTests(pagination.page); }}
        />
      )}
    </div>
  );
}

/* ─── Create Practice Test Modal ──────────────────── */
function CreatePracticeTestModal({
  plans,
  onClose,
  onSuccess,
}: {
  plans: Plan[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "Academic",
    module: "listening",
    accessLevel: "",
    duration: "",
    difficulty: "easy",
    rating: "",
    usersCount: "",
    tags: "",
    instructions: "",
  });
  const [saving, setSaving] = useState(false);

  // Auto-select first plan when plans load
  useEffect(() => {
    if (plans.length > 0 && !form.accessLevel) {
      setForm((prev) => ({ ...prev, accessLevel: plans[0].slug }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          examType: "practice",
          duration: form.duration ? Number(form.duration) : 0,
          rating: form.rating ? Number(form.rating) : 0,
          usersCount: form.usersCount ? Number(form.usersCount) : 0,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      Swal.fire("Created!", "Practice test created as Draft.", "success");
      onSuccess();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create New Practice Test</h2>
          <p className="text-sm text-gray-500 mt-1">
            Practice tests show instant correct answers · No strict timer required
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Listening Practice - Multiple Choice"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              aria-label="Description"
              placeholder="Brief description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                aria-label="Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Academic">Academic</option>
                <option value="General">General</option>
                <option value="Speaking Only">Speaking Only</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module <span className="text-red-500">*</span></label>
              <select
                aria-label="Module"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
            {plans.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Loading plans…</p>
            ) : (
              <select
                aria-label="Access Level"
                value={form.accessLevel}
                onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="free">Free Access</option>
                {plans.map((plan) => (
                  <option key={plan.slug} value={plan.slug}>
                    {plan.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timer (minutes) <span className="text-gray-400 text-xs">optional</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Leave blank = no timer"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                aria-label="Difficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating <span className="text-gray-400 text-xs">(0–5)</span>
              </label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                placeholder="e.g. 4.8"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Users Taken</label>
              <input
                type="number"
                min={0}
                value={form.usersCount}
                onChange={(e) => setForm({ ...form, usersCount: e.target.value })}
                placeholder="e.g. 1200"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 text-xs">comma-separated</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. MCQ, New, Premium"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              aria-label="Instructions"
              placeholder="Instructions shown to students before they start..."
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Test Modal ─────────────────────────────────── */
function EditTestModal({
  test,
  plans,
  onClose,
  onSuccess,
}: {
  test: Test;
  plans: Plan[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: test.title,
    description: (test as any).description ?? "",
    type: test.type ?? "Academic",
    module: test.module,
    accessLevel: test.accessLevel,
    duration: test.duration ? String(test.duration) : "",
    difficulty: test.difficulty ?? "easy",
    rating: test.rating ? String(test.rating) : "",
    usersCount: test.usersCount ? String(test.usersCount) : "",
    tags: test.tags ? test.tags.join(", ") : "",
    instructions: (test as any).instructions ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tests/${test._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duration: form.duration ? Number(form.duration) : 0,
          rating: form.rating ? Number(form.rating) : 0,
          usersCount: form.usersCount ? Number(form.usersCount) : 0,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      Swal.fire("Saved!", "Practice test has been updated.", "success");
      onSuccess();
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Practice Test</h2>
          <p className="text-sm text-gray-500 mt-1 truncate">{test.title}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Listening Practice - Multiple Choice"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              aria-label="Description"
              placeholder="Brief description of this test..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                aria-label="Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Academic">Academic</option>
                <option value="General">General</option>
                <option value="Speaking Only">Speaking Only</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Module"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
            {plans.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Loading plans…</p>
            ) : (
              <select
                aria-label="Access Level"
                value={form.accessLevel}
                onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="free">Free Access</option>
                {plans.map((plan) => (
                  <option key={plan.slug} value={plan.slug}>
                    {plan.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timer (minutes) <span className="text-gray-400 text-xs">optional</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Leave blank = no timer"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                aria-label="Difficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating <span className="text-gray-400 text-xs">(0–5)</span>
              </label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                placeholder="e.g. 4.8"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Users Taken</label>
              <input
                type="number"
                min={0}
                value={form.usersCount}
                onChange={(e) => setForm({ ...form, usersCount: e.target.value })}
                placeholder="e.g. 1200"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 text-xs">comma-separated</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. MCQ, New, Premium"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              aria-label="Instructions"
              placeholder="Instructions shown to students before they start..."
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
