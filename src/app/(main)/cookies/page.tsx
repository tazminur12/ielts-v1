import Link from "next/link";
import {
  ChevronRight,
  Cookie,
  FileText,
  Gauge,
  Link2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Megaphone,
} from "lucide-react";

export default function CookiePolicyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-blue-200/35 blur-[110px]" />
        <div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-200/30 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] bg-size-[22px_22px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Legal</span>
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-2xl mx-auto">
            This policy explains what cookies are, which types we use, and how you can control them.
          </p>
        </div>

        <div className="mt-8 rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-5 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">Quick summary</p>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Cookies help us keep you signed in, measure performance, and improve the experience.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800">
                <RefreshCw className="w-4 h-4 text-slate-500" />
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <Section icon={<FileText className="w-5 h-5 text-slate-700" />} title="1. What are cookies?">
            Cookies are small text files stored on your device when you visit a website. They help remember information about your session and preferences (like staying signed in).
          </Section>

          <Section icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />} title="2. Types of cookies we use">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniCard
                icon={<Lock className="w-4 h-4 text-blue-700" />}
                title="Essential"
                desc="Required for core site functions (login/session)."
              />
              <MiniCard
                icon={<Gauge className="w-4 h-4 text-emerald-700" />}
                title="Performance"
                desc="Helps us understand usage to improve speed and reliability."
              />
              <MiniCard
                icon={<SlidersHorizontal className="w-4 h-4 text-indigo-700" />}
                title="Functional"
                desc="Remembers preferences like language and UI settings."
              />
              <MiniCard
                icon={<Megaphone className="w-4 h-4 text-amber-700" />}
                title="Marketing"
                desc="May be used to display relevant offers or campaigns."
              />
            </div>
          </Section>

          <Section icon={<Cookie className="w-5 h-5 text-blue-700" />} title="3. How we use cookies">
            <ul className="space-y-2">
              {[
                "Remember your login information and preferences",
                "Analyze traffic and usage patterns",
                "Improve functionality and user experience",
                "Help prevent fraud and protect security",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Link2 className="w-5 h-5 text-fuchsia-700" />} title="4. Third‑party cookies">
            Some cookies may be set by trusted third parties (e.g., analytics providers). These providers may collect information about your device and usage to deliver aggregated insights.
          </Section>

          <Section icon={<SlidersHorizontal className="w-5 h-5 text-indigo-700" />} title="5. Managing your cookies">
            Most browsers let you control cookies through settings. You can accept, reject, delete cookies, or be notified before cookies are stored. Disabling cookies may affect site functionality.
          </Section>

          <Section icon={<FileText className="w-5 h-5 text-slate-700" />} title="6. Do Not Track signals">
            Some browsers offer a “Do Not Track” feature. There is no consistent industry standard for responding to it, and we may not respond to these signals.
          </Section>

          <Section icon={<RefreshCw className="w-5 h-5 text-slate-700" />} title="7. Updates to this policy">
            We may update this Cookie Policy to reflect changes in practices or legal requirements. We will update the “Last updated” date accordingly.
          </Section>

          <Section icon={<Mail className="w-5 h-5 text-slate-700" />} title="8. Contact">
            <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-extrabold text-slate-900">Questions?</p>
              <p className="text-sm text-slate-600 font-medium mt-1">
                If you have questions about cookies, contact us:
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-700 font-semibold">
                  <span className="font-extrabold text-slate-900">Email:</span> privacy@ieltspracticepro.com
                </p>
                <p className="text-slate-700 font-semibold">
                  <span className="font-extrabold text-slate-900">Website:</span> www.ieltspracticepro.com
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-extrabold">
            <ChevronRight size={16} className="rotate-180" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{title}</h2>
          <div className="mt-2 text-sm text-slate-700 font-medium leading-relaxed">{children}</div>
        </div>
      </div>
    </section>
  );
}

function MiniCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">{title}</p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}
