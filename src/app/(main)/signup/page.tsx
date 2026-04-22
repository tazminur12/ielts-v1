'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react'; 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        title: 'Error!',
        text: 'Passwords do not match',
        icon: 'error',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'rounded-3xl' },
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      router.push('/login?registered=true');
    } catch (err: any) {
      Swal.fire({
        title: 'Error!',
        text: err.message,
        icon: 'error',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'rounded-3xl' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-[110px]" />
        <div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-200/35 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] bg-size-[22px_22px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-28 pb-12 lg:pt-32 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm"
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
                Create your account
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-6 text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]"
            >
              Start your IELTS
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-700">
                success story.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-4 text-lg text-slate-600 max-w-xl font-medium leading-relaxed"
            >
              Create an account to unlock full mock tests, personalized practice, and progress insights.
            </motion.p>

            <div className="mt-8 grid gap-3 max-w-md">
              {[
                {
                  icon: <Sparkles className="text-blue-700" size={18} />,
                  title: 'Personalized learning',
                  desc: 'Practice paths tailored to your goal.',
                },
                {
                  icon: <Globe className="text-indigo-700" size={18} />,
                  title: 'Global standards',
                  desc: 'Updated IELTS patterns and content.',
                },
                {
                  icon: <ShieldCheck className="text-emerald-700" size={18} />,
                  title: 'Secure & verified',
                  desc: 'Your data stays private and protected.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + i * 0.08 }}
                  className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur px-4 py-3 shadow-sm"
                >
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-md bg-white/90 backdrop-blur border border-slate-200 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.25)] rounded-4xl p-7 sm:p-9 relative overflow-hidden"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-700 shadow-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                Create account
              </div>

              <h2 className="mt-5 text-3xl font-extrabold text-slate-900 tracking-tight">
                Get started
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 font-medium">
                Sign up in less than a minute.
              </p>

              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="mt-7 w-full flex items-center justify-center gap-3 py-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-2xl font-extrabold text-slate-800 transition-all duration-200 shadow-sm group focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-sm">Continue with Google</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">
                    or use email
                  </span>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 ml-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="name"
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-400"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 ml-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-400"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-400"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 ml-1">
                      Confirm password
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-400"
                        placeholder="Repeat your password"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl shadow-lg shadow-slate-900/10 transition-all active:scale-[0.99] disabled:opacity-70 group mt-4 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                  {!loading && (
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-slate-600 font-semibold text-sm">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-blue-700 hover:text-blue-800 font-extrabold decoration-2 underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
