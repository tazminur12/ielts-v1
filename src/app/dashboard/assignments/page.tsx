"use client";

import { useState, useEffect } from "react";
import { uploadFile } from "@/lib/uploadFile";
import Swal from "sweetalert2";
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  X,
} from "lucide-react";

interface Question {
  _id: string;
  title: string;
  type: "listening" | "reading" | "writing" | "speaking";
  difficulty: "easy" | "medium" | "hard";
  createdBy: string;
  createdAt: string;
  status: "active" | "draft" | "archived";
  questionCount?: number;
  fileUrl?: string;
  description?: string;
}

export default function AssignmentManagementPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New assignment form state
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    type: "listening",
    difficulty: "medium",
    description: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Question | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewAssignment, setViewAssignment] = useState<Question | null>(null);

  // Fetch actual data
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.file) {
      Swal.fire({
        icon: "warning",
        title: "Missing Details",
        text: "Please provide a title and upload a file.",
      });
      return;
    }

    try {
      setUploading(true);
      const fileUrl = await uploadFile(newAssignment.file);

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAssignment.title,
          type: newAssignment.type,
          difficulty: newAssignment.difficulty,
          description: newAssignment.description,
          fileUrl: fileUrl,
          createdBy: "Admin",
          status: "active",
          questionCount: 0,
        }),
      });

      if (res.ok) {
        setShowUploadModal(false);
        setNewAssignment({ title: "", type: "listening", difficulty: "medium", description: "", file: null });
        fetchAssignments();
        Swal.fire({ icon: "success", title: "Success!", text: "Assignment created successfully", timer: 2000, showConfirmButton: false });
      } else {
        const errorData = await res.json();
        Swal.fire({ icon: "error", title: "Creation Failed", text: errorData.error || "Unknown error" });
      }
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      Swal.fire({ icon: "error", title: "Upload Error", text: error.message || "Unknown error" });
    } finally {
      setUploading(false);
    }
  };

  // ── VIEW ──
  const handleView = (question: Question) => {
    setViewAssignment(question);
    setShowViewModal(true);
  };

  // ── EDIT ──
  const handleEditOpen = (question: Question) => {
    setEditAssignment({ ...question });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editAssignment) return;
    if (!editAssignment.title) {
      Swal.fire({ icon: "warning", title: "Missing Title", text: "Title cannot be empty." });
      return;
    }
    try {
      setEditSaving(true);
      const res = await fetch(`/api/assignments/${editAssignment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editAssignment.title,
          type: editAssignment.type,
          difficulty: editAssignment.difficulty,
          status: editAssignment.status,
          description: editAssignment.description,
          questionCount: editAssignment.questionCount,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchAssignments();
        Swal.fire({ icon: "success", title: "Updated!", text: "Assignment updated successfully.", timer: 2000, showConfirmButton: false });
      } else {
        const errorData = await res.json();
        Swal.fire({ icon: "error", title: "Update Failed", text: errorData.error || "Unknown error" });
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message || "Unknown error" });
    } finally {
      setEditSaving(false);
    }
  };

  // ── DOWNLOAD ──
  const handleDownload = (question: Question) => {
    if (!question.fileUrl) {
      Swal.fire({ icon: "info", title: "No File", text: "No file is attached to this assignment." });
      return;
    }
    window.open(question.fileUrl, "_blank");
  };

  // ── DELETE ──
  const handleDelete = async (question: Question) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: `"${question.title}" will be permanently deleted.`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/assignments/${question._id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAssignments();
        Swal.fire({ icon: "success", title: "Deleted!", text: "Assignment has been deleted.", timer: 2000, showConfirmButton: false });
      } else {
        const errorData = await res.json();
        Swal.fire({ icon: "error", title: "Delete Failed", text: errorData.error || "Unknown error" });
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message || "Unknown error" });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "listening":
        return "bg-blue-100 text-blue-800";
      case "reading":
        return "bg-green-100 text-green-800";
      case "writing":
        return "bg-purple-100 text-purple-800";
      case "speaking":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "archived":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesFilter = filter === "all" || q.type === filter;
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assignment Management
          </h1>
          <p className="text-gray-500">
            Create and manage exam questions and assignments
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Assignment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Assignments
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {questions.length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {questions.filter((q) => q.status === "active").length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Drafts</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {questions.filter((q) => q.status === "draft").length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
              <Edit className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Questions</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {questions.reduce((sum, q) => sum + (q.questionCount || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
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
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading assignments...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No assignments found
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery || filter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first assignment to get started"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuestions.map((question) => (
                  <tr
                    key={question._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {question.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getTypeColor(
                          question.type
                        )}`}
                      >
                        {question.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getDifficultyColor(
                          question.difficulty
                        )}`}
                      >
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {question.questionCount}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getStatusColor(
                          question.status
                        )}`}
                      >
                        {question.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {question.createdBy}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(question.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(question)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditOpen(question)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(question)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(question)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Create New Assignment
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload questions and configure assignment settings
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Title
                </label>
                <input
                  type="text"
                  placeholder="Enter assignment title"
                  value={newAssignment.title}
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newAssignment.type}
                  title="type"
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="listening">Listening</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="speaking">Speaking</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={newAssignment.difficulty}
                  title="difficulty"
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      difficulty: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Questions
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    title="Upload file"
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        file: e.target.files ? e.target.files[0] : null,
                      })
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-1">
                    {newAssignment.file ? (
                      <span className="text-blue-600 font-medium">
                        {newAssignment.file.name}
                      </span>
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    JSON, PDF, or DOCX (max 10MB)
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter assignment description"
                  value={newAssignment.description}
                  onChange={(e) =>
                    setNewAssignment({
                      ...newAssignment,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Create Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Modal */}
      {showViewModal && viewAssignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Assignment Details</h2>
              <button onClick={() => setShowViewModal(false)} title="Close" className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Title</p>
                <p className="text-gray-900 font-medium">{viewAssignment.title}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Type</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getTypeColor(viewAssignment.type)}`}>
                    {viewAssignment.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Difficulty</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getDifficultyColor(viewAssignment.difficulty)}`}>
                    {viewAssignment.difficulty}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${getStatusColor(viewAssignment.status)}`}>
                    {viewAssignment.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Created By</p>
                  <p className="text-gray-800 text-sm">{viewAssignment.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Questions</p>
                  <p className="text-gray-800 text-sm">{viewAssignment.questionCount ?? 0}</p>
                </div>
              </div>
              {viewAssignment.description && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</p>
                  <p className="text-gray-700 text-sm">{viewAssignment.description}</p>
                </div>
              )}
              {viewAssignment.fileUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Attached File</p>
                  <a
                    href={viewAssignment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 text-sm hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    View / Download File
                  </a>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editAssignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Assignment</h2>
              <button onClick={() => setShowEditModal(false)} title="Close" className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  title="Assignment title"
                  placeholder="Enter assignment title"
                  value={editAssignment.title}
                  onChange={(e) => setEditAssignment({ ...editAssignment, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    title="type"
                    value={editAssignment.type}
                    onChange={(e) => setEditAssignment({ ...editAssignment, type: e.target.value as Question["type"] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="listening">Listening</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                    <option value="speaking">Speaking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    title="difficulty"
                    value={editAssignment.difficulty}
                    onChange={(e) => setEditAssignment({ ...editAssignment, difficulty: e.target.value as Question["difficulty"] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    title="status"
                    value={editAssignment.status}
                    onChange={(e) => setEditAssignment({ ...editAssignment, status: e.target.value as Question["status"] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Count</label>
                  <input
                    type="number"
                    title="Question count"
                    placeholder="0"
                    value={editAssignment.questionCount ?? 0}
                    onChange={(e) => setEditAssignment({ ...editAssignment, questionCount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  title="Description"
                  placeholder="Enter description"
                  value={editAssignment.description ?? ""}
                  onChange={(e) => setEditAssignment({ ...editAssignment, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
