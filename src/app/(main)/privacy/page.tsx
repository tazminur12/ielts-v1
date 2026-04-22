import Link from "next/link";
import {
  ChevronRight,
  Lock,
  ShieldCheck,
  Sparkles,
  Mail,
  FileText,
  Database,
  CreditCard,
  Eye,
  Users,
} from "lucide-react";

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-blue-200/35 blur-[110px]" />
        <div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-200/30 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] bg-size-[22px_22px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-32">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
              Legal
            </span>
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-2xl mx-auto">
            We respect your privacy. This policy explains what data we collect, why we collect it, and how you can manage it.
          </p>
        </div>

        {/* Top strip */}
        <div className="mt-8 rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-5 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">Summary</p>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  We only collect what we need to provide the service and improve your learning experience.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800">
                <FileText className="w-4 h-4 text-slate-500" />
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="mt-8 space-y-4">
          <Section
            icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />}
            title="1. Introduction"
          >
            IELTS Practice Pro (“we”, “us”, “our”) operates this website and related services that reference this policy. This Privacy Policy describes how we collect, use, share, and protect information when you use the site.
          </Section>

          <Section
            icon={<Database className="w-5 h-5 text-blue-700" />}
            title="2. Information we collect"
          >
            <div className="space-y-3 text-slate-700">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">Personal data</p>
                <p className="text-sm font-medium mt-1">
                  Information you provide when creating an account or updating your profile, such as your name, email address, and learning preferences.
                </p>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">Usage / device data</p>
                <p className="text-sm font-medium mt-1">
                  Basic technical data such as IP address, browser type, device identifiers, and pages viewed—used for security, reliability, and analytics.
                </p>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">Payment data</p>
                <p className="text-sm font-medium mt-1">
                  If you purchase a plan, payment processing is handled by third‑party providers (for example Stripe). We do not store full card details on our servers.
                </p>
              </div>
            </div>
          </Section>

          <Section
            icon={<Eye className="w-5 h-5 text-indigo-700" />}
            title="3. How we use your information"
          >
            <ul className="space-y-2 text-sm text-slate-700 font-medium">
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                Create and manage your account and profile
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                Provide content, features, and customer support
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                Process subscriptions and billing, and send service communications
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                Improve performance, security, and user experience
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                Comply with legal obligations
              </li>
            </ul>
          </Section>

          <Section
            icon={<Users className="w-5 h-5 text-amber-700" />}
            title="4. Sharing and disclosure"
          >
            <div className="space-y-3 text-sm text-slate-700 font-medium">
              <p>
                We may share information only when necessary:
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  <span>
                    <span className="font-extrabold text-slate-900">Service providers</span>: vendors who help us operate the platform (e.g., hosting, email delivery).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  <span>
                    <span className="font-extrabold text-slate-900">Payments</span>: payment processors such as Stripe handle sensitive payment details.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  <span>
                    <span className="font-extrabold text-slate-900">Legal</span>: when required by law or to protect rights, safety, and security.
                  </span>
                </li>
              </ul>
            </div>
          </Section>

          <Section
            icon={<CreditCard className="w-5 h-5 text-fuchsia-700" />}
            title="5. Data security"
          >
            <p className="text-sm text-slate-700 font-medium">
              We use administrative, technical, and physical safeguards designed to protect your information. However, no method of transmission or storage is 100% secure.
            </p>
          </Section>

          <Section
            icon={<Mail className="w-5 h-5 text-slate-700" />}
            title="6. Contact"
          >
            <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-extrabold text-slate-900">Need help?</p>
              <p className="text-sm text-slate-600 font-medium mt-1">
                If you have questions or requests about privacy, contact us:
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

        {/* Back */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-extrabold"
          >
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
