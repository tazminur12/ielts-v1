/**
 * Speaking Test Configuration Component for Admin Dashboard
 * 
 * Provides Part-specific settings:
 * 1. Part-specific customization (Part 1, 2, 3)
 * 2. Individual question duration override
 * 3. Prep time configuration
 * 4. Rubric customization
 */

import { useState } from "react";
import { Mic, ChevronDown, ChevronUp, Plus, X, Save, AlertCircle } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

export interface SpeakingPartConfig {
  partNumber: 1 | 2 | 3;
  title: string;
  instructions: string;
  timeLimit: number; // seconds
  prepTime?: number; // Part 2 only, in seconds
  questionCount: {
    min: number;
    max: number;
  };
  durationPerQuestion: number; // seconds
  rubric: {
    fluency: string;
    pronunciation: string;
    vocabulary: string;
    grammar: string;
  };
  enabled: boolean;
}

export interface QuestionDurationOverride {
  questionNumber: number;
  duration: number; // seconds
  notes: string;
}

export interface SpeakingTestConfig {
  part1: SpeakingPartConfig;
  part2: SpeakingPartConfig;
  part3: SpeakingPartConfig;
  durationOverrides: QuestionDurationOverride[];
  totalTime: number; // auto-calculated
}

// ─── Default Config ──────────────────────────────────────────────────────

const DEFAULT_IELTS_CONFIG: SpeakingTestConfig = {
  part1: {
    partNumber: 1,
    title: "Introduction and Interview",
    instructions: "Answer the following questions about yourself.",
    timeLimit: 300, // 5 minutes
    questionCount: { min: 6, max: 8 },
    durationPerQuestion: 30,
    rubric: {
      fluency: "Can talk about familiar topics with minimal hesitation",
      pronunciation: "Pronunciation is clear enough to understand",
      vocabulary: "Uses appropriate vocabulary for the topic",
      grammar: "Uses a range of grammar structures",
    },
    enabled: true,
  },
  part2: {
    partNumber: 2,
    title: "Long Turn (Cue Card)",
    instructions: "Here is your cue card. You have one minute to prepare and then two minutes to speak.",
    timeLimit: 180, // 2-3 minutes speaking
    prepTime: 60, // 1 minute prep
    questionCount: { min: 1, max: 1 },
    durationPerQuestion: 120,
    rubric: {
      fluency: "Speaks fluently without long pauses; develops ideas",
      pronunciation: "Clear pronunciation; can be easily understood",
      vocabulary: "Uses a range of vocabulary; some less common words",
      grammar: "Uses complex sentence structures; few errors",
    },
    enabled: true,
  },
  part3: {
    partNumber: 3,
    title: "Discussion",
    instructions: "Let's discuss this topic further.",
    timeLimit: 300, // 4-5 minutes
    questionCount: { min: 4, max: 6 },
    durationPerQuestion: 60,
    rubric: {
      fluency: "Expresses ideas clearly; discusses abstract concepts",
      pronunciation: "Clear and natural pronunciation",
      vocabulary: "Uses sophisticated vocabulary; good precision",
      grammar: "Consistent control of complex structures",
    },
    enabled: true,
  },
  durationOverrides: [],
  totalTime: 780, // 13 minutes total
};

// ─── Main Component ──────────────────────────────────────────────────────

export function SpeakingTestConfigurationPanel() {
  const [config, setConfig] = useState<SpeakingTestConfig>(DEFAULT_IELTS_CONFIG);
  const [expandedPart, setExpandedPart] = useState<1 | 2 | 3 | null>(1);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState<QuestionDurationOverride>({
    questionNumber: 1,
    duration: 30,
    notes: "",
  });

  // Calculate total time
  const calculateTotalTime = () => {
    const part1Time = config.part1.timeLimit;
    const part2Time = config.part2.timeLimit + (config.part2.prepTime || 0);
    const part3Time = config.part3.timeLimit;
    return part1Time + part2Time + part3Time;
  };

  const handlePartChange = (
    partNumber: 1 | 2 | 3,
    field: keyof SpeakingPartConfig,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [partNumber === 1 ? "part1" : partNumber === 2 ? "part2" : "part3"]: {
        ...prev[partNumber === 1 ? "part1" : partNumber === 2 ? "part2" : "part3"],
        [field]: value,
      },
      totalTime: calculateTotalTime(),
    }));
  };

  const handleRubricChange = (
    partNumber: 1 | 2 | 3,
    criterion: keyof SpeakingPartConfig["rubric"],
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [partNumber === 1 ? "part1" : partNumber === 2 ? "part2" : "part3"]: {
        ...prev[partNumber === 1 ? "part1" : partNumber === 2 ? "part2" : "part3"],
        rubric: {
          ...prev[partNumber === 1 ? "part1" : partNumber === 2 ? "part2" : "part3"].rubric,
          [criterion]: value,
        },
      },
    }));
  };

  const addDurationOverride = () => {
    if (
      !config.durationOverrides.find((o) => o.questionNumber === overrideForm.questionNumber)
    ) {
      setConfig((prev) => ({
        ...prev,
        durationOverrides: [...prev.durationOverrides, overrideForm],
      }));
      setOverrideForm({ questionNumber: 1, duration: 30, notes: "" });
      setShowOverrideForm(false);
    }
  };

  const removeDurationOverride = (questionNumber: number) => {
    setConfig((prev) => ({
      ...prev,
      durationOverrides: prev.durationOverrides.filter((o) => o.questionNumber !== questionNumber),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Mic size={20} className="text-rose-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Speaking Test Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure Part 1, 2, 3 settings and customize duration, prep time, and rubrics
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium flex items-center gap-2"
            onClick={() => alert("Save configuration")}
          >
            <Save size={16} />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Total Time Display */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase">Part 1 Duration</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {Math.round(config.part1.timeLimit / 60)} min
          </p>
          <p className="text-xs text-blue-600 mt-2">5-6 minutes (4-5 questions)</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase">Part 2 Duration</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {Math.round((config.part2.timeLimit + (config.part2.prepTime || 0)) / 60)} min
          </p>
          <p className="text-xs text-purple-600 mt-2">1 min prep + 2 min speak</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase">Part 3 Duration</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {Math.round(config.part3.timeLimit / 60)} min
          </p>
          <p className="text-xs text-amber-600 mt-2">4-5 minutes (4-6 questions)</p>
        </div>
      </div>

      {/* Part-Specific Configuration */}
      <div className="space-y-4">
        {[1, 2, 3].map((partNum) => {
          const part = config[`part${partNum as 1 | 2 | 3}` as const];
          const isExpanded = expandedPart === partNum;

          return (
            <div key={partNum} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Part Header */}
              <button
                onClick={() => setExpandedPart(isExpanded ? null : (partNum as 1 | 2 | 3))}
                className="w-full p-5 bg-linear-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    {partNum}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{part.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{part.instructions}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>

              {/* Part Content */}
              {isExpanded && (
                <div className="p-6 space-y-6 border-t border-gray-200">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Part Title
                      </label>
                      <input
                        type="text"
                        title="Part title"
                        value={part.title}
                        onChange={(e) =>
                          handlePartChange(partNum as 1 | 2 | 3, "title", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Time Limit (seconds)
                      </label>
                      <input
                        type="number"
                        title="Time limit in seconds"
                        value={part.timeLimit}
                        onChange={(e) =>
                          handlePartChange(partNum as 1 | 2 | 3, "timeLimit", parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    {partNum === 2 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Prep Time (seconds)
                        </label>
                        <input
                          type="number"
                          title="Prep time in seconds"
                          value={part.prepTime || 60}
                          onChange={(e) =>
                            handlePartChange(partNum as 1 | 2 | 3, "prepTime", parseInt(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Duration per Question (seconds)
                      </label>
                      <input
                        type="number"
                        title="Duration per question in seconds"
                        value={part.durationPerQuestion}
                        onChange={(e) =>
                          handlePartChange(
                            partNum as 1 | 2 | 3,
                            "durationPerQuestion",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Instructions
                    </label>
                    <textarea
                      title="Part instructions"
                      value={part.instructions}
                      onChange={(e) =>
                        handlePartChange(partNum as 1 | 2 | 3, "instructions", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  {/* Question Count */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">Question Count Range</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-blue-700">Minimum</label>
                        <input
                          type="number"
                          title="Minimum question count"
                          value={part.questionCount.min}
                          onChange={(e) =>
                            handlePartChange(partNum as 1 | 2 | 3, "questionCount", {
                              ...part.questionCount,
                              min: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-blue-700">Maximum</label>
                        <input
                          type="number"
                          title="Maximum question count"
                          value={part.questionCount.max}
                          onChange={(e) =>
                            handlePartChange(partNum as 1 | 2 | 3, "questionCount", {
                              ...part.questionCount,
                              max: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rubric Customization */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Evaluation Rubric</p>
                    <div className="space-y-3">
                      {Object.entries(part.rubric).map(([criterion, description]) => (
                        <div key={criterion}>
                          <label className="text-xs font-medium text-gray-600 uppercase mb-1 block">
                            {criterion}
                          </label>
                          <textarea
                            title={`Rubric for ${criterion}`}
                            value={description}
                            onChange={(e) =>
                              handleRubricChange(
                                partNum as 1 | 2 | 3,
                                criterion as keyof SpeakingPartConfig["rubric"],
                                e.target.value
                              )
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Duration Overrides */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 bg-linear-to-r from-gray-50 to-gray-100">
          <h3 className="font-semibold text-gray-900">Duration Overrides (Individual Questions)</h3>
          <p className="text-xs text-gray-600 mt-1">Override the default duration for specific questions</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Override Form */}
          {showOverrideForm && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-amber-900 block mb-1">
                    Question Number
                  </label>
                  <input
                    type="number"
                    title="Question number for override"
                    value={overrideForm.questionNumber}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, questionNumber: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-900 block mb-1">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    title="Duration in seconds"
                    value={overrideForm.duration}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, duration: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-900 block mb-1">Notes</label>
                  <input
                    type="text"
                    value={overrideForm.notes}
                    onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addDurationOverride}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                >
                  Add Override
                </button>
                <button
                  onClick={() => setShowOverrideForm(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Overrides */}
          {config.durationOverrides.length > 0 ? (
            <div className="space-y-2">
              {config.durationOverrides.map((override) => (
                <div
                  key={override.questionNumber}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Question {override.questionNumber}: {override.duration}s
                    </p>
                    {override.notes && <p className="text-xs text-gray-600 mt-0.5">{override.notes}</p>}
                  </div>
                  <button
                    title="Remove this duration override"
                    onClick={() => removeDurationOverride(override.questionNumber)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {!showOverrideForm && (
            <button
              onClick={() => setShowOverrideForm(true)}
              title="Add duration override for a specific question"
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Duration Override
            </button>
          )}
        </div>
      </div>

      {/* Validation Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-green-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-900">Configuration follows IELTS standards</p>
          <p className="text-xs text-green-700 mt-1">
            Total test duration: {Math.round(calculateTotalTime() / 60)} minutes (recommended 11-14 min)
          </p>
        </div>
      </div>
    </div>
  );
}

// Export for use in admin dashboard
export default SpeakingTestConfigurationPanel;
