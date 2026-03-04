"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { uploadFile } from "@/lib/uploadFile";
import Swal from "sweetalert2";
import {
  Upload,
  Image as ImageIcon,
  Edit,
  Eye,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";

interface Banner {
  _id: string;
  page: "home" | "about";
  imageUrl: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export default function BannerManagementPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Add banner modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBanner, setNewBanner] = useState({
    page: "home" as "home" | "about",
    title: "",
    subtitle: "",
    isActive: true,
    file: null as File | null,
    previewUrl: "",
  });
  const [adding, setAdding] = useState(false);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Failed to fetch banners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // ── OPEN EDIT ──
  const handleEdit = (banner: Banner) => {
    setEditingBanner({ ...banner });
    setPreviewImage(banner.imageUrl);
    setSelectedFile(null);
    setShowModal(true);
  };

  // ── SAVE EDIT ──
  const handleSave = async () => {
    if (!editingBanner) return;
    if (!editingBanner.title) {
      Swal.fire({ icon: "warning", title: "Missing Title", text: "Please enter a title." });
      return;
    }
    try {
      setSaving(true);
      let imageUrl = editingBanner.imageUrl;

      // Upload new image if selected
      if (selectedFile) {
        imageUrl = await uploadFile(selectedFile);
      }

      const res = await fetch(`/api/banners/${editingBanner._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingBanner.title,
          subtitle: editingBanner.subtitle,
          isActive: editingBanner.isActive,
          imageUrl,
          updatedBy: "Admin",
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingBanner(null);
        setSelectedFile(null);
        fetchBanners();
        Swal.fire({ icon: "success", title: "Saved!", text: "Banner updated successfully.", timer: 2000, showConfirmButton: false });
      } else {
        const err = await res.json();
        Swal.fire({ icon: "error", title: "Save Failed", text: err.error || "Unknown error" });
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Upload Error", text: error.message || "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  // ── IMAGE CHANGE (edit) ──
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── ADD NEW BANNER ──
  const handleAddBanner = async () => {
    if (!newBanner.title || !newBanner.file) {
      Swal.fire({ icon: "warning", title: "Missing Details", text: "Please enter a title and upload an image." });
      return;
    }
    try {
      setAdding(true);
      const imageUrl = await uploadFile(newBanner.file);

      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: newBanner.page,
          title: newBanner.title,
          subtitle: newBanner.subtitle,
          isActive: newBanner.isActive,
          imageUrl,
          updatedBy: "Admin",
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewBanner({ page: "home", title: "", subtitle: "", isActive: true, file: null, previewUrl: "" });
        fetchBanners();
        Swal.fire({ icon: "success", title: "Created!", text: "Banner added successfully.", timer: 2000, showConfirmButton: false });
      } else {
        const err = await res.json();
        Swal.fire({ icon: "error", title: "Failed", text: err.error || "Unknown error" });
      }
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Upload Error", text: error.message || "Unknown error" });
    } finally {
      setAdding(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async (banner: Banner) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: `The "${banner.page}" page banner will be permanently deleted.`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/banners/${banner._id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBanners();
        Swal.fire({ icon: "success", title: "Deleted!", timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ icon: "error", title: "Delete Failed" });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error" });
    }
  };

  // ── VIEW (open image in new tab) ──
  const handleView = (banner: Banner) => {
    if (banner.imageUrl) {
      window.open(banner.imageUrl, "_blank");
    } else {
      Swal.fire({ icon: "info", title: "No Image", text: "No image is attached to this banner." });
    }
  };

  const getPageBadge = (page: string) =>
    page === "home" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-gray-500">Manage banners for Home and About pages</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Banner
        </button>
      </div>

      {/* Banners Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No banners found</h3>
          <p className="mt-2 text-gray-500">Click &quot;Add New Banner&quot; to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div key={banner._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Banner Preview */}
              <div className="relative h-64 bg-gray-100">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getPageBadge(banner.page)}`}>
                    {banner.page} Page
                  </span>
                </div>
                {banner.isActive && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-green-100 text-green-700">Active</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end">
                  <div className="p-6 text-white w-full">
                    <h3 className="text-xl font-bold mb-1">{banner.title}</h3>
                    <p className="text-sm text-gray-200">{banner.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Banner Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500">
                    <p>Last updated: {new Date(banner.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p>By: {banner.updatedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Banner
                  </button>
                  <button
                    onClick={() => handleView(banner)}
                    title="View image"
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    title="Delete banner"
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Banner</h2>
                <p className="text-sm text-gray-500 mt-1">Upload an image and fill in the details</p>
              </div>
              <button onClick={() => setShowAddModal(false)} title="Close" className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page</label>
                <select
                  title="page"
                  value={newBanner.page}
                  onChange={(e) => setNewBanner({ ...newBanner, page: e.target.value as "home" | "about" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="home">Home Page</option>
                  <option value="about">About Page</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative min-h-45">
                  {newBanner.previewUrl ? (
                    <img src={newBanner.previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                      <Upload className="w-10 h-10 text-gray-400" />
                      <p className="text-sm text-gray-500"><span className="text-blue-600 font-medium">Click to upload</span> or drag & drop</p>
                      <p className="text-xs text-gray-400">Recommended: 1920×600px. Max 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    title="Upload banner image"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setNewBanner({ ...newBanner, file, previewUrl: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  title="Banner title"
                  placeholder="Enter banner title"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (Optional)</label>
                <textarea
                  rows={2}
                  title="Banner subtitle"
                  placeholder="Enter subtitle"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Active */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBanner.isActive}
                    onChange={(e) => setNewBanner({ ...newBanner, isActive: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as active banner</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
                Cancel
              </button>
              <button
                onClick={handleAddBanner}
                disabled={adding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                {adding ? "Uploading..." : "Upload & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showModal && editingBanner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Edit {editingBanner.page.charAt(0).toUpperCase() + editingBanner.page.slice(1)} Page Banner
                </h2>
                <p className="text-sm text-gray-500 mt-1">Update banner image and content</p>
              </div>
              <button onClick={() => setShowModal(false)} title="Close" className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm font-medium">Upload New Image</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
                {selectedFile && (
                  <p className="text-xs text-blue-600 mt-2">New file selected: {selectedFile.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Hover over image to change. Recommended: 1920×600px</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Title</label>
                <input
                  type="text"
                  title="Banner title"
                  value={editingBanner.title}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter banner title"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Subtitle</label>
                <textarea
                  rows={3}
                  title="Banner subtitle"
                  value={editingBanner.subtitle}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter banner subtitle"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBanner.isActive}
                    onChange={(e) => setEditingBanner({ ...editingBanner, isActive: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as active banner</span>
                </label>
              </div>

              {/* Live Preview */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Live Preview:</p>
                <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-4 text-white w-full">
                      <h3 className="text-lg font-bold mb-1">{editingBanner.title || "Banner Title"}</h3>
                      <p className="text-sm text-gray-200">{editingBanner.subtitle || "Banner Subtitle"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}