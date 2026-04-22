import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Gavel,
  Link2,
  Lock,
  Mail,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-2xl mx-auto">
            These terms govern your access to and use of IELTS Practice Pro. By using the site, you agree to these terms.
          </p>
        </div>

        <div className="mt-8 rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-5 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">Quick summary</p>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Use the platform responsibly, respect intellectual property, and follow all applicable laws.
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
          <Section icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />} title="1. Acceptance of terms">
            By accessing or using IELTS Practice Pro, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.
          </Section>

          <Section icon={<Lock className="w-5 h-5 text-blue-700" />} title="2. Use license">
            You may use the site materials for personal, non‑commercial use only. Under this license you may not:
            <ul className="mt-3 space-y-2">
              {[
                "Modify or copy the materials",
                "Use the materials for commercial purposes or public display",
                "Attempt to decompile or reverse engineer any software",
                "Remove copyright or proprietary notices",
                "Mirror the materials on another server",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<AlertTriangle className="w-5 h-5 text-amber-700" />} title="3. Disclaimer">
            The service and materials are provided on an “as is” basis without warranties of any kind, either express or implied. We do not guarantee uninterrupted access or error‑free operation.
          </Section>

          <Section icon={<Scale className="w-5 h-5 text-indigo-700" />} title="4. Limitations of liability">
            To the maximum extent permitted by law, IELTS Practice Pro will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
          </Section>

          <Section icon={<FileText className="w-5 h-5 text-slate-700" />} title="5. Accuracy of materials">
            Content may include technical, typographical, or factual errors. We may update or change content at any time without notice.
          </Section>

          <Section icon={<Link2 className="w-5 h-5 text-fuchsia-700" />} title="6. Links to third‑party websites">
            We are not responsible for the content of third‑party websites linked from our service. Accessing external links is at your own risk.
          </Section>

          <Section icon={<RefreshCw className="w-5 h-5 text-slate-700" />} title="7. Modifications to these terms">
            We may revise these Terms from time to time. Your continued use of the service after changes become effective constitutes acceptance of the updated terms.
          </Section>

          <Section icon={<Gavel className="w-5 h-5 text-rose-700" />} title="8. Governing law">
            These Terms are governed by the laws of the jurisdiction where the Company is located, without regard to conflict‑of‑law principles.
          </Section>

          <Section icon={<Mail className="w-5 h-5 text-slate-700" />} title="9. Contact">
            <div className="rounded-4xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-extrabold text-slate-900">Questions?</p>
              <p className="text-sm text-slate-600 font-medium mt-1">Contact us for help with Terms of Service:</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-700 font-semibold">
                  <span className="font-extrabold text-slate-900">Email:</span> support@ieltspracticepro.com
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

