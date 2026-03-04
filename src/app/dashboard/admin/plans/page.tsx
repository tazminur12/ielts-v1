"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  Package,
  Loader2,
  Check,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    mockTests: number | "unlimited";
    speakingEvaluations: number | "unlimited";
    writingCorrections: number | "unlimited";
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
    customFeatures?: string[];
  };
  isActive: boolean;
  isPremium: boolean;
  displayOrder: number;
  trialDays: number;
  createdAt: string;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowModal(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    const result = await Swal.fire({
      title: "Delete Plan?",
      text: `Are you sure you want to delete "${planName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const plan = plans.find((p) => p._id === planId);
        const response = await fetch(`/api/plans/${plan?.slug}`, {
          method: "DELETE",
        });

        if (response.ok) {
          Swal.fire("Deleted!", "Plan has been deleted.", "success");
          fetchPlans();
        }
      } catch (error) {
        Swal.fire("Error!", "Failed to delete plan.", "error");
      }
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const response = await fetch(`/api/plans/${plan.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      if (response.ok) {
        Swal.fire(
          "Success!",
          `Plan ${plan.isActive ? "deactivated" : "activated"}`,
          "success"
        );
        fetchPlans();
      }
    } catch (error) {
      Swal.fire("Error!", "Failed to update plan.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pricing Plans</h1>
          <p className="text-slate-600 mt-1">
            Manage your subscription plans and pricing
          </p>
        </div>
        <button
          onClick={handleCreatePlan}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create New Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Total Plans</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {plans.length}
              </p>
            </div>
            <Package className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Active Plans</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {plans.filter((p) => p.isActive).length}
              </p>
            </div>
            <Eye className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Premium Plans</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {plans.filter((p) => p.isPremium).length}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Avg Monthly Price</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                $
                {(
                  plans.reduce((sum, p) => sum + p.price.monthly, 0) /
                  (plans.length || 1)
                ).toFixed(0)}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-700">
                  Plan Name
                </th>
                <th className="text-left p-4 font-semibold text-slate-700">
                  Pricing
                </th>
                <th className="text-left p-4 font-semibold text-slate-700">
                  Features
                </th>
                <th className="text-center p-4 font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-center p-4 font-semibold text-slate-700">
                  Trial
                </th>
                <th className="text-center p-4 font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {plan.name}
                          {plan.isPremium && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          {plan.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-semibold text-slate-900">
                        ${plan.price.monthly}/mo
                      </div>
                      <div className="text-slate-500">
                        ${plan.price.yearly}/mo yearly
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {plan.features.mockTests === "unlimited" ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          ∞ Tests
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {plan.features.mockTests} Tests
                        </span>
                      )}
                      {plan.features.hasAnalytics && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Analytics
                        </span>
                      )}
                      {plan.features.has1on1Coaching && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          1-on-1
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        plan.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {plan.isActive ? (
                        <>
                          <Check className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm text-slate-600">
                      {plan.trialDays > 0
                        ? `${plan.trialDays} days`
                        : "No trial"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title={plan.isActive ? "Deactivate" : "Activate"}
                      >
                        {plan.isActive ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan._id, plan.name)}
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

        {plans.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No plans created yet</p>
            <button
              onClick={handleCreatePlan}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Create your first plan
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
}

// Plan Creation/Edit Modal Component
function PlanModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    slug: plan?.slug || "",
    description: plan?.description || "",
    monthlyPrice: plan?.price.monthly || 0,
    yearlyPrice: plan?.price.yearly || 0,
    mockTests: plan?.features.mockTests === "unlimited" ? -1 : (plan?.features.mockTests || 0),
    speakingEvaluations: plan?.features.speakingEvaluations === "unlimited" ? -1 : (plan?.features.speakingEvaluations || 0),
    writingCorrections: plan?.features.writingCorrections === "unlimited" ? -1 : (plan?.features.writingCorrections || 0),
    hasAnalytics: plan?.features.hasAnalytics || false,
    hasPersonalizedPlan: plan?.features.hasPersonalizedPlan || false,
    hasPrioritySupport: plan?.features.hasPrioritySupport || false,
    has1on1Coaching: plan?.features.has1on1Coaching || false,
    customFeatures: plan?.features.customFeatures?.join("\n") || "",
    isPremium: plan?.isPremium || false,
    trialDays: plan?.trialDays || 0,
    displayOrder: plan?.displayOrder || 0,
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
        description: formData.description,
        price: {
          monthly: Number(formData.monthlyPrice),
          yearly: Number(formData.yearlyPrice),
        },
        features: {
          mockTests: formData.mockTests === -1 ? "unlimited" : Number(formData.mockTests),
          speakingEvaluations: formData.speakingEvaluations === -1 ? "unlimited" : Number(formData.speakingEvaluations),
          writingCorrections: formData.writingCorrections === -1 ? "unlimited" : Number(formData.writingCorrections),
          hasAnalytics: formData.hasAnalytics,
          hasPersonalizedPlan: formData.hasPersonalizedPlan,
          hasPrioritySupport: formData.hasPrioritySupport,
          has1on1Coaching: formData.has1on1Coaching,
          customFeatures: formData.customFeatures
            .split("\n")
            .filter((f) => f.trim()),
        },
        isPremium: formData.isPremium,
        trialDays: Number(formData.trialDays),
        displayOrder: Number(formData.displayOrder),
      };

      const url = plan ? `/api/plans/${plan.slug}` : "/api/plans";
      const method = plan ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire("Success!", `Plan ${plan ? "updated" : "created"} successfully!`, "success");
        onSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Swal.fire("Error!", error.message || "Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {plan ? "Edit Plan" : "Create New Plan"}
            </h2>
            <button
              onClick={onClose}
              type="button"
              title="Close"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="md:col-span-2">
              <h3 className="font-bold text-slate-900 mb-4">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Pro Achiever"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Slug (URL) *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="pro-achiever"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Everything you need to succeed"
              />
            </div>

            {/* Pricing */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-bold text-slate-900 mb-4">Pricing</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Monthly Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Yearly Price ($/month)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.yearlyPrice}
                onChange={(e) => setFormData({ ...formData, yearlyPrice: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Features */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-bold text-slate-900 mb-4">Features (Use -1 for unlimited)</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mock Tests
              </label>
              <input
                type="number"
                value={formData.mockTests}
                onChange={(e) => setFormData({ ...formData, mockTests: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">-1 = Unlimited</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Speaking Evaluations
              </label>
              <input
                type="number"
                value={formData.speakingEvaluations}
                onChange={(e) => setFormData({ ...formData, speakingEvaluations: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Writing Corrections
              </label>
              <input
                type="number"
                value={formData.writingCorrections}
                onChange={(e) => setFormData({ ...formData, writingCorrections: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Trial Days
              </label>
              <input
                type="number"
                min="0"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Boolean Features */}
            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasAnalytics}
                  onChange={(e) => setFormData({ ...formData, hasAnalytics: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Analytics Dashboard</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasPersonalizedPlan}
                  onChange={(e) => setFormData({ ...formData, hasPersonalizedPlan: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Personalized Study Plan</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasPrioritySupport}
                  onChange={(e) => setFormData({ ...formData, hasPrioritySupport: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Priority Support</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has1on1Coaching}
                  onChange={(e) => setFormData({ ...formData, has1on1Coaching: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">1-on-1 Coaching</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPremium}
                  onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Mark as Popular (Premium)</span>
              </label>
            </div>

            {/* Custom Features */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Custom Features (one per line)
              </label>
              <textarea
                value={formData.customFeatures}
                onChange={(e) => setFormData({ ...formData, customFeatures: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Advanced Vocabulary Builder&#10;Progress Tracking&#10;Certificate on Completion"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Lower numbers appear first</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
