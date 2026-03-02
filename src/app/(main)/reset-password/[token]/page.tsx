"use client";

import { useState } from "react";
// next/navigation helpers not required in this component
import Swal from "sweetalert2";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const token = params?.token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      Swal.fire({ title: "Error", text: "Password must be at least 6 characters.", icon: "error" });
      return;
    }
    if (password !== confirm) {
      Swal.fire({ title: "Error", text: "Passwords do not match.", icon: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ title: "Success", text: data.message || "Password reset.", icon: "success", confirmButtonColor: "#2563eb" }).then(() => {
          window.location.href = "/login";
        });
      } else {
        Swal.fire({ title: "Error", text: data.error || "Failed to reset password", icon: "error" });
      }
    } catch (err) {
      Swal.fire({ title: "Error", text: "Request failed", icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Reset your password</h2>
        <p className="text-sm text-slate-600 mb-6">Set a new password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              placeholder="New password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              placeholder="Confirm password"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            {loading ? "Saving..." : "Set new password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered your password? <a href="/login" className="text-blue-600 font-semibold">Sign in</a>
        </p>
      </div>
    </div>
  );
}
