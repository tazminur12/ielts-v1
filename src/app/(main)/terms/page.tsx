import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-slate-600 text-base">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm prose prose-sm max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-700 leading-relaxed">
            By accessing and using IELTS Practice Pro website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Use License</h2>
          <p className="text-slate-700 leading-relaxed">
            Permission is granted to temporarily download one copy of the materials (information or software) on IELTS Practice Pro for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4 mt-4">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the site</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or &ldquo;mirror&rdquo; the materials on any other server</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Disclaimer</h2>
          <p className="text-slate-700 leading-relaxed">
            The materials on IELTS Practice Pro are provided on an &ldquo;as is&rdquo; basis. IELTS Practice Pro makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Limitations</h2>
          <p className="text-slate-700 leading-relaxed">
            In no event shall IELTS Practice Pro or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on IELTS Practice Pro.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Accuracy of Materials</h2>
          <p className="text-slate-700 leading-relaxed">
            The materials appearing on IELTS Practice Pro could include technical, typographical, or photographic errors. IELTS Practice Pro does not warrant that any of the materials on the website are accurate, complete, or current. IELTS Practice Pro may make changes to the materials contained on the website at any time without notice.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Links</h2>
          <p className="text-slate-700 leading-relaxed">
            IELTS Practice Pro has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by IELTS Practice Pro of the site. Use of any such linked website is at the user&rsquo;s own risk.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Modifications</h2>
          <p className="text-slate-700 leading-relaxed">
            IELTS Practice Pro may revise these terms of service for the website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Governing Law</h2>
          <p className="text-slate-700 leading-relaxed">
            These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction where the company is located, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
            <p className="text-slate-700"><strong>Email:</strong> support@ieltspracticepro.com</p>
            <p className="text-slate-700"><strong>Website:</strong> www.ieltspracticepro.com</p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
