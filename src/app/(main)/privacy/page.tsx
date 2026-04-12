import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-600 text-base">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm prose prose-sm max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
          <p className="text-slate-700 leading-relaxed">
            IELTS Practice Pro (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our,&rdquo; or &ldquo;Company&rdquo;) operates the website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, including all related applications, widgets, and services that reference this Privacy Policy.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>
          <p className="text-slate-700 leading-relaxed mb-4">We may collect information about you in a variety of ways. The information we may collect on the site includes:</p>
          
          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Personal Data</h3>
          <p className="text-slate-700 leading-relaxed">
            Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you choose to participate in, and sign up for, any of our activities related to our website.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Derivative Data</h3>
          <p className="text-slate-700 leading-relaxed">
            Information our servers automatically collect when you access the website, such as your IP address, your browser type, your operating system, your Internet Service Provider, and your pages visited.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Financial Data</h3>
          <p className="text-slate-700 leading-relaxed">
            Financial information, such as funds related to your purchases, may be collected when you make a purchase through the website. We may collect and process financial information through Stripe or other third-party payment processors.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Use of Your Information</h2>
          <p className="text-slate-700 leading-relaxed mb-4">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:</p>
          <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
            <li>Create and manage your account</li>
            <li>Process your transactions and send related information</li>
            <li>Email you regarding your account or subscription</li>
            <li>Improve our services and personalize your experience</li>
            <li>Respond to your inquiries, questions, and requests</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Disclosure of Your Information</h2>
          <p className="text-slate-700 leading-relaxed">
            We may share information we have collected about you in certain situations:
          </p>
          <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4 mt-4">
            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information is necessary to comply with the law or to protect the rights, property, and safety of others.</li>
            <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us, including payment processing, email delivery, and customer service.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Security of Your Information</h2>
          <p className="text-slate-700 leading-relaxed">
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, no security measures are completely impenetrable.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have questions or comments about this Privacy Policy, please contact us at:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
            <p className="text-slate-700"><strong>Email:</strong> privacy@ieltspracticepro.com</p>
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
