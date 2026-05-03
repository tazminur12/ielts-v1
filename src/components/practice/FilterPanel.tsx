"use client";

import { Filter, Sparkles, Clock, Clock3 } from "lucide-react";

interface FilterOptions {
  topic: string;
  questionType: string;
  difficulty: string;
  practiceMode: "timed" | "untimed" | "instant";
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  topics: string[];
}

export default function PracticeFilterPanel({
  filters,
  onFilterChange,
  topics,
}: FilterPanelProps) {
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const questionTypes = [
    { value: "", label: "All Types" },
    { value: "multiple_choice", label: "Multiple Choice" },
    { value: "true_false_not_given", label: "True/False/Not Given" },
    { value: "fill_blank", label: "Fill in the Blank" },
    { value: "matching", label: "Matching" },
    { value: "matching_headings", label: "Matching Headings" },
    { value: "sentence_completion", label: "Sentence Completion" },
  ];

  const difficulties = [
    { value: "", label: "All Difficulties" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={18} className="text-indigo-600" />
        <h3 className="font-bold text-slate-800">Practice Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Topic</label>
          <select
            value={filters.topic}
            onChange={(e) => updateFilter("topic", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Question Type</label>
          <select
            value={filters.questionType}
            onChange={(e) => updateFilter("questionType", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => updateFilter("difficulty", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {difficulties.map((diff) => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Practice Mode</label>
          <select
            value={filters.practiceMode}
            onChange={(e) => updateFilter("practiceMode", e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="timed">
              <span className="flex items-center gap-2">
                <Clock3 size={14} /> Timed Practice
              </span>
            </option>
            <option value="untimed">
              <span className="flex items-center gap-2">
                <Clock size={14} /> Untimed Practice
              </span>
            </option>
            <option value="instant">
              <span className="flex items-center gap-2">
                <Sparkles size={14} /> Instant Feedback
              </span>
            </option>
          </select>
        </div>
      </div>

      {filters.practiceMode === "instant" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <Sparkles size={16} className="inline mr-1.5" />
          Instant Feedback mode will show correct answers and explanations immediately after you answer each question.
        </div>
      )}
    </div>
  );
}
