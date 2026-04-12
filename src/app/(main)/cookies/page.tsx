import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-slate-600 text-base">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm prose prose-sm max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. What Are Cookies?</h2>
          <p className="text-slate-700 leading-relaxed">
            Cookies are small files that are stored on your device when you visit a website. They contain data about your browsing preferences and are used to remember information about you, such as your login status or language preference.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Types of Cookies We Use</h2>
          
          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Essential Cookies</h3>
          <p className="text-slate-700 leading-relaxed">
            These cookies are necessary for the website to function properly and cannot be disabled. They include cookies that help you log in and maintain your session.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Performance Cookies</h3>
          <p className="text-slate-700 leading-relaxed">
            These cookies collect information about how you use the website, such as which pages you visit and any errors you encounter. This helps us improve our service.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Functional Cookies</h3>
          <p className="text-slate-700 leading-relaxed">
            These cookies allow the website to remember your preferences, such as your language settings, so you do not have to set them again on each visit.
          </p>

          <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3">Marketing Cookies</h3>
          <p className="text-slate-700 leading-relaxed">
            These cookies are used to track your online activity and to display targeted advertisements based on your interests.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Cookies</h2>
          <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
            <li>To remember your login information and preferences</li>
            <li>To analyze website traffic and usage patterns</li>
            <li>To improve the functionality and user experience of the website</li>
            <li>To deliver targeted advertising and marketing content</li>
            <li>To monitor and prevent fraud and security issues</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Third-Party Cookies</h2>
          <p className="text-slate-700 leading-relaxed">
            Some cookies may be set by third parties, such as analytics providers and advertising networks. These third parties may use cookies to collect information about your online activities across multiple websites to deliver targeted advertisements to you.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Managing Your Cookies</h2>
          <p className="text-slate-700 leading-relaxed">
            Most web browsers allow you to control cookies through their settings. You can choose to:
          </p>
          <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4 mt-4">
            <li>Accept all cookies</li>
            <li>Reject all cookies</li>
            <li>Delete all cookies</li>
            <li>Be notified before cookies are stored</li>
          </ul>
          <p className="text-slate-700 leading-relaxed mt-4">
            However, please note that disabling cookies may affect the functionality of the website and your user experience.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Do Not Track Signals</h2>
          <p className="text-slate-700 leading-relaxed">
            Some browsers include a &ldquo;Do Not Track&rdquo; feature. Currently, there is no industry standard for recognizing Do Not Track signals, and the website does not respond to Do Not Track browser signals.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Updates to This Cookie Policy</h2>
          <p className="text-slate-700 leading-relaxed">
            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the &ldquo;Last updated&rdquo; date of this Cookie Policy.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
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
