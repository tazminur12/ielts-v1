"use client";

import Link from "next/link";
import { Users, Globe, Target, Shield, ArrowRight, Award, Zap, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const stats = [
    { label: 'Students Helped', value: '50K+', icon: <Users className="w-5 h-5" /> },
    { label: 'Mock Tests Taken', value: '1M+', icon: <Zap className="w-5 h-5" /> },
    { label: 'Success Rate', value: '95%', icon: <Award className="w-5 h-5" /> },
    { label: 'Global Reach', value: '50+', icon: <Globe className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      
      {/* 1. Hero Section - Compact & Professional */}
      <section className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-50 blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold mb-2 text-xs uppercase tracking-wider">
            <Target size={14} />
            <span>About IELTS Practice Pro</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Empowering Your <span className="text-blue-600">Global Journey</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We are dedicated to democratizing IELTS preparation by combining expert pedagogy with advanced technology to help you achieve your dream score.
          </p>
        </div>
      </section>

      {/* 2. Stats Grid - Compact */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 text-center hover:shadow-md transition-all"
            >
              <div className="inline-flex p-2 bg-blue-50 text-blue-600 rounded-lg mb-2">
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Story Section - Simplified */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                Bridging the Gap Between <br />
                <span className="text-blue-600">Ambition & Achievement</span>
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p className="text-sm md:text-base">
                  It started with a simple observation: talented students were missing out on global opportunities not because of their potential, but because of a lack of proper guidance for the IELTS exam.
                </p>
                <p className="text-sm md:text-base">
                  In 2023, we assembled a team of experienced educators, linguists, and engineers to solve this. Our goal was to create a platform that offers expert feedback and standardized grading at an affordable price.
                </p>
                <p className="text-sm md:text-base">
                  Today, we&apos;re proud to be the trusted partner for thousands of test-takers worldwide, helping them turn their study abroad and immigration dreams into reality.
                </p>
              </div>

              {/* Key Features */}
              <div className="mt-6 space-y-3">
                {[
                  "Expert-designed practice materials",
                  "Standardized grading system",
                  "Comprehensive progress tracking"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Image Placeholder */}
            <div className="bg-slate-200 rounded-lg h-80 flex items-center justify-center overflow-hidden">
              <div className="bg-linear-to-br from-blue-100 to-emerald-100 w-full h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Users size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Team & Community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Values Section - Compact */}
      <section className="py-10 bg-white border-t border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Our Core Values</h2>
            <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">We believe in integrity, innovation, and putting students first in everything we do.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Student-Centric",
                desc: "Every feature is designed to help you succeed",
                icon: <Target className="w-6 h-6 text-white" />,
                color: "bg-blue-600"
              },
              {
                title: "Quality First",
                desc: "Authentic materials following official IELTS standards",
                icon: <Shield className="w-6 h-6 text-white" />,
                color: "bg-emerald-600"
              },
              {
                title: "Always Improving",
                desc: "Continuously enhancing our platform for you",
                icon: <Zap className="w-6 h-6 text-white" />,
                color: "bg-blue-600"
              }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all">
                <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4 shadow-sm`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA Section - Compact */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-xl p-8 md:p-12 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to Achieve Your IELTS Goals?
            </h2>
            <p className="text-slate-300 text-sm md:text-base mb-6 max-w-lg mx-auto">
              Start practicing with our comprehensive platform and get instant, standardized feedback.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-white text-slate-900 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-all"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
