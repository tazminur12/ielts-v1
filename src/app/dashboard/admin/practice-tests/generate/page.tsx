"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, BrainCircuit, BookType, Mic, Headphones, 
  PenTool, Trophy, Type, FileEdit, CheckCircle, 
  Loader2, Sparkles, Settings, Hash
} from "lucide-react";
import Swal from "sweetalert2";

export default function GenerateAITestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    title: "",
    module: "reading",
    topic: "",
    difficulty: "medium",
    accessLevel: "free",
    questionCount: 5,
    questionTypes: ["multiple_choice"]
  });

  const availableTypesForModule = () => {
    switch(form.module) {
      case "listening":
      case "reading":
        return [
          { id: "multiple_choice", label: "Multiple Choice" },
          { id: "true_false_not_given", label: "True / False / Not Given" },
          { id: "yes_no_not_given", label: "Yes / No / Not Given" },
          { id: "matching_headings", label: "Matching Headings" },
          { id: "short_answer", label: "Short Answer" }
        ];
      case "writing":
        return [
          { id: "essay", label: "Essay (Task 2)" },
          { id: "report", label: "Chart/Graph Report (Task 1)" }
        ];
      case "speaking":
        return [
          { id: "interview", label: "Interview (Part 1)" },
          { id: "cue_card", label: "Cue Card (Part 2)" },
          { id: "discussion", label: "Discussion (Part 3)" }
        ];
      default:
        return [];
    }
  };

  const toggleQuestionType = (typeId: string) => {
    setForm(prev => {
      const exists = prev.questionTypes.includes(typeId);
      if (exists && prev.questionTypes.length === 1) return prev; // prevent empty
      return {
        ...prev,
        questionTypes: exists
          ? prev.questionTypes.filter(t => t !== typeId)
          : [...prev.questionTypes, typeId]
      };
    });
  };

  // Automatically reset selected types if module changes
  useEffect(() => {
    const types = availableTypesForModule();
    if (types.length > 0) {
      setForm(prev => ({ ...prev, questionTypes: [types[0].id] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.module]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      setPlans(data.data || []);
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await fetch('/api/admin/tests/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: form.title || `AI Generated ${form.topic || 'Practice'} (${form.module})`,
          module: form.module,
          topic: form.topic || "General", 
          difficulty: form.difficulty,
          accessLevel: form.accessLevel,
          questionCount: form.questionCount,
          questionTypes: form.questionTypes
        })
      });
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);
      
      await Swal.fire({
        title: 'Success!',
        text: 'AI generated the test successfully and it has been saved as a Draft.',
        icon: 'success',
        confirmButtonColor: '#9333ea'
      });
      
      router.push('/dashboard/admin/practice-tests');
    } catch (error: any) {
      Swal.fire("Generation Failed", error.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: "listening", name: "Listening", icon: Headphones, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", selBorder: "border-blue-500", selBg: "bg-blue-50/50" },
    { id: "reading", name: "Reading", icon: BookType, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", selBorder: "border-emerald-500", selBg: "bg-emerald-50/50" },
    { id: "writing", name: "Writing", icon: PenTool, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200", selBorder: "border-purple-500", selBg: "bg-purple-50/50" },
    { id: "speaking", name: "Speaking", icon: Mic, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-200", selBorder: "border-rose-500", selBg: "bg-rose-50/50" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/admin/practice-tests"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <BrainCircuit className="text-purple-600" />
            Generate Test with AI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure parameters to automatically generate high-quality IELTS practice content.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Form Area */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleGenerate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
            
            {/* Module Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookType size={16} className="text-gray-400" />
                Select Module
              </label>
              <div className="grid grid-cols-2 gap-3">
                {modules.map((m) => {
                  const isSelected = form.module === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, module: m.id })}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? `${m.selBorder} ${m.selBg} shadow-sm` 
                          : `border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50`
                      }`}
                    >
                      <div className={`p-3 rounded-full mb-3 ${isSelected ? 'bg-white shadow-sm' : m.bg}`}>
                        <m.icon size={24} className={isSelected ? m.color : 'text-gray-500'} />
                      </div>
                      <span className={`font-semibold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic & Title */}
            <div className="space-y-5 pt-4 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Type size={16} className="text-gray-400" />
                  Primary Topic or Theme <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Climate change, Technology, Education history..."
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm border-gray-700 font-semibold flex items-center gap-2">
                  <FileEdit size={16} className="text-gray-400" />
                  Custom Title <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input 
                  type="text"
                  placeholder={`Auto-generates if left blank`}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>

              {/* Question Types */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BrainCircuit size={16} className="text-gray-400" />
                  Question Types
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableTypesForModule().map(qt => (
                    <label 
                      key={qt.id}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors select-none ${
                        form.questionTypes.includes(qt.id) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={form.questionTypes.includes(qt.id)}
                        onChange={() => toggleQuestionType(qt.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">{qt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-purple-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-base hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate with AI
                  </>
                )}
                {/* Shine effect */}
                {!loading && (
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                This process usually takes 5-15 seconds depending on the module.
              </p>
            </div>
          </form>
        </div>

        {/* Sidebar Configurables */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Settings className="text-gray-400 w-5 h-5" />
              Test Settings
            </h3>
            
            {/* Difficulty */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Trophy size={16} className="text-gray-400" />
                Difficulty Level
              </label>
              <div className="space-y-2">
                {["easy", "medium", "hard"].map(diff => (
                  <label key={diff} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors select-none ${form.difficulty === diff ? 'border-purple-500 bg-purple-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="difficulty"
                      value={diff}
                      checked={form.difficulty === diff}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.difficulty === diff ? 'border-purple-600' : 'border-gray-300'}`}>
                       {form.difficulty === diff && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                    </div>
                    <span className="capitalize text-sm font-medium text-gray-700">{diff}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Question Count Selector */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Hash size={16} className="text-gray-400" />
                  Question Count
                </label>
                <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg text-sm">
                  {form.questionCount}
                </span>
              </div>
              <input
                aria-label="Question Count"
                type="range"
                min="1"
                max={form.module === "writing" ? 2 : form.module === "speaking" ? 3 : 20}
                value={form.questionCount}
                onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>1</span>
                <span>{form.module === "writing" ? 2 : form.module === "speaking" ? 3 : 20}</span>
              </div>
            </div>

            {/* Access Level */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle size={16} className="text-gray-400" />
                Access Level
              </label>
              <select 
                aria-label="Access Level"
                value={form.accessLevel}
                onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="free">Free Access</option>
                {plans.map(p => (
                  <option key={p.slug} value={p.slug}>Required Plan: {p.name}</option>
                ))}
              </select>
            </div>
            
          </div>

          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-amber-900 mb-2">Did you know?</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              AI generation creates a comprehensive draft test containing sections, question groups, and fully-mapped multiple choice/essay fields. 
              <br/><br/>
              After generation, you can manually review and edit the generated questions before publishing to your students.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}