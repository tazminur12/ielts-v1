"use client";

import { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          title: "If an account exists",
          text: "If an account exists for this email, a reset link has been sent. Check your inbox.",
          icon: "success",
          confirmButtonColor: "#2563eb",
        });
        // For dev/testing show link if returned
        if (data.resetLink) setDevLink(data.resetLink);
      } else {
        Swal.fire({ title: "Error", text: data.error || "Failed", icon: "error" });
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
        <h2 className="text-2xl font-bold mb-2">Forgot your password?</h2>
  <p className="text-sm text-slate-600 mb-6">Enter the email associated with your account and we will send a link to reset your password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {devLink && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md text-sm">
            <div className="font-semibold">Dev reset link:</div>
            <Link href={devLink} className="text-blue-600 break-all underline">
              {devLink}
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link href="/login" className="text-blue-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
