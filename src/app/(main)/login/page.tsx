'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const redirectTo = searchParams.get('redirect');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (registered) {
      Swal.fire({
        title: 'Registration Successful!',
        text: 'Please sign in with your credentials.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
        customClass: { popup: 'rounded-[2rem]' },
      });
    }
  }, [registered]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        Swal.fire({
          title: 'Access Denied',
          text: 'Invalid credentials. Please check your email or password.',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-[2rem]' },
        });
        setLoading(false);
      } else {
        router.push(redirectTo || '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md bg-white/90 backdrop-blur border border-slate-200 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.25)] rounded-4xl p-7 sm:p-9 relative overflow-hidden"
    >
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-700 shadow-sm">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Student portal
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Secure sign-in
          </span>
        </div>

        <h2 className="mt-5 text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 font-medium">
          Sign in to continue to your IELTS dashboard.
        </p>
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: redirectTo || '/dashboard' })}
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

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-100"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">
            or use email
          </span>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
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
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-extrabold text-blue-600 hover:text-blue-700"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-slate-900 font-semibold placeholder:text-slate-400"
                placeholder="••••••••"
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl shadow-lg shadow-slate-900/10 transition-all active:scale-[0.99] disabled:opacity-70 mt-4 group focus:outline-none focus:ring-4 focus:ring-slate-900/10"
        >
          {loading ? 'Signing in…' : 'Sign in'}
          {!loading && (
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-slate-600 font-semibold text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-blue-700 hover:text-blue-800 font-extrabold decoration-2 underline-offset-4 hover:underline"
        >
          Create Account
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
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
                Learn • Practice • Improve
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-6 text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]"
            >
              Your IELTS practice,
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-700">
                made consistent.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-4 text-lg text-slate-600 max-w-xl font-medium leading-relaxed"
            >
              Train with realistic mock tests, track your progress, and get clear feedback—so you always know what to practice next.
            </motion.p>

            <div className="mt-8 grid gap-3 max-w-md">
              {[
                {
                  icon: <Zap className="text-amber-600" size={18} />,
                  title: 'Fast feedback',
                  desc: 'Actionable suggestions after each attempt.',
                },
                {
                  icon: <ShieldCheck className="text-blue-700" size={18} />,
                  title: 'Secure access',
                  desc: 'Your account and progress stay protected.',
                },
                {
                  icon: <CheckCircle2 className="text-emerald-600" size={18} />,
                  title: 'Track improvement',
                  desc: 'See trends across practice and mocks.',
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
            <Suspense
              fallback={
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
