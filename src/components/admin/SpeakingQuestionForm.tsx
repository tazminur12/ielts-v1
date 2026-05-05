/**
 * Speaking Question Configuration Component
 * 
 * Specialized form for Speaking test questions with:
 * - Speaking prompt field
 * - Duration presets (30s, 60s, 120s)
 * - Part-wise instruction templates
 * - Cue card template builder (Part 2)
 * - Question marking guide
 */

import { useState } from "react";
import { Clock, BookOpen, Lightbulb, AlertCircle, Plus, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

export interface SpeakingQuestion {
  questionNumber: number;
  questionText: string;
  speakingPrompt: string;
  durationSeconds: number;
  partNumber: 1 | 2 | 3;
  cueCardTemplate?: {
    topic: string;
    bulletPoints: string[];
    followUpQuestion?: string;
  };
  markingGuide: {
    fluency: string;
    pronunciation: string;
    vocabulary: string;
    grammar: string;
  };
  sampleAnswer?: string;
}

export interface CueCardTemplate {
  topic: string;
  bulletPoints: string[]; // 3-5 points per cue card
  followUpQuestion: string;
}

// ─── Duration Presets ───────────────────────────────────────────────────

const DURATION_PRESETS = [
  { label: "30 seconds", value: 30, part: 1 },
  { label: "60 seconds", value: 60, part: [1, 3] as any },
  { label: "120 seconds", value: 120, part: 2 },
];

// ─── Part-wise Templates ────────────────────────────────────────────────

const INSTRUCTION_TEMPLATES = {
  1: {
    title: "Part 1: Introduction and Interview",
    description: "Answer questions about yourself",
    instructions: "I'm going to ask you some questions about yourself. Let's talk about...",
    sampleTopics: ["Personal background", "Family", "Work/Studies", "Hobbies", "Travel", "Daily routine"],
    typical_duration: 4,
    typical_questions: 6,
  },
  2: {
    title: "Part 2: Long Turn (Cue Card)",
    description: "Speak about a topic for 2 minutes",
    instructions: "I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you start, you'll have one minute to think about what you're going to say.",
    typical_duration: 3,
    typical_questions: 1,
    cue_card_format: true,
  },
  3: {
    title: "Part 3: Discussion",
    description: "Discuss abstract topics",
    instructions: "We've been talking about [topic from Part 2]. I'd like to discuss some more general questions related to this.",
    typical_duration: 5,
    typical_questions: 5,
  },
};

// ─── Marking Guide Templates ────────────────────────────────────────────

const MARKING_GUIDE_TEMPLATES = {
  1: {
    fluency: "Speaks fluently without long pauses or hesitation. Can maintain conversation with minimal support.",
    pronunciation: "Pronunciation is clear and intelligible. Minor accent acceptable.",
    vocabulary: "Uses appropriate vocabulary for familiar topics. Some less common words.",
    grammar: "Uses a range of simple and complex structures with good control.",
  },
  2: {
    fluency: "Develops topic coherently and fully. Speaks fluently with natural intonation. Minimal pauses or repetition.",
    pronunciation: "Clear pronunciation. Easy to understand. Natural rhythm and intonation.",
    vocabulary: "Uses a range of vocabulary including some less common or specialized words.",
    grammar: "Uses complex sentence structures with good accuracy and variation.",
  },
  3: {
    fluency: "Discusses abstract concepts fluidly. Sophisticated use of discourse markers. Minimal hesitation.",
    pronunciation: "Natural, clear pronunciation with appropriate stress and intonation patterns.",
    vocabulary: "Uses sophisticated vocabulary precisely. Shows mastery of word choice and expression.",
    grammar: "Consistent control of complex grammar. Uses a full range of structures accurately.",
  },
};

// ─── Default Cue Card Template ──────────────────────────────────────────

const DEFAULT_CUE_CARD: CueCardTemplate = {
  topic: "Describe a memorable event",
  bulletPoints: [
    "What the event was",
    "When and where it happened",
    "Why it was memorable",
  ],
  followUpQuestion: "What did you learn from this experience?",
};

// ─── Main Component ─────────────────────────────────────────────────────

export function SpeakingQuestionForm({
  partNumber,
  questionNumber,
  onSubmit,
  onCancel,
}: {
  partNumber: 1 | 2 | 3;
  questionNumber: number;
  onSubmit: (question: SpeakingQuestion) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [questionText, setQuestionText] = useState("");
  const [speakingPrompt, setSpeakingPrompt] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(
    partNumber === 2 ? 120 : partNumber === 3 ? 60 : 30
  );
  const [cueCard, setCueCard] = useState<CueCardTemplate | null>(
    partNumber === 2 ? DEFAULT_CUE_CARD : null
  );
  const [markingGuide, setMarkingGuide] = useState(MARKING_GUIDE_TEMPLATES[partNumber]);
  const [sampleAnswer, setSampleAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const template = INSTRUCTION_TEMPLATES[partNumber];

  const handleDurationPreset = (seconds: number) => {
    setDurationSeconds(seconds);
  };

  const handleAddBulletPoint = () => {
    if (cueCard) {
      setCueCard({
        ...cueCard,
        bulletPoints: [...cueCard.bulletPoints, ""],
      });
    }
  };

  const handleUpdateBulletPoint = (index: number, value: string) => {
    if (cueCard) {
      const updated = [...cueCard.bulletPoints];
      updated[index] = value;
      setCueCard({ ...cueCard, bulletPoints: updated });
    }
  };

  const handleRemoveBulletPoint = (index: number) => {
    if (cueCard) {
      setCueCard({
        ...cueCard,
        bulletPoints: cueCard.bulletPoints.filter((_, i) => i !== index),
      });
    }
  };

  const handleUpdateMarkingGuide = (criterion: keyof typeof markingGuide, value: string) => {
    setMarkingGuide({ ...markingGuide, [criterion]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const question: SpeakingQuestion = {
        questionNumber,
        questionText,
        speakingPrompt,
        durationSeconds,
        partNumber,
        cueCardTemplate: cueCard ?? undefined,
        markingGuide,
        sampleAnswer: sampleAnswer || undefined,
      };

      await onSubmit(question);
    } catch (err) {
      console.error("Error submitting question:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Part Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-blue-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">{template.title}</p>
            <p className="text-sm text-blue-700 mt-1">{template.instructions}</p>
          </div>
        </div>
      </div>

      {/* Question Number and Text */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Question #{questionNumber}
          </label>
          <input
            type="text"
            title="Question number display (read-only)"
            value={`${questionNumber}`}
            readOnly
            className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Question Text *
          </label>
          <textarea
            required
            title="Main question text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={`What would you like to ask for Part ${partNumber}?`}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is what the examiner will ask or display to the student
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Speaking Prompt
          </label>
          <textarea
            title="Speaking prompt for student"
            value={speakingPrompt}
            onChange={(e) => setSpeakingPrompt(e.target.value)}
            placeholder={`e.g., "Tell me about your favorite book and why you like it..."`}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Additional context or follow-up prompts for the student
          </p>
        </div>
      </div>

      {/* Duration Configuration */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-purple-700" />
          <p className="font-semibold text-purple-900">Duration</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DURATION_PRESETS.filter((p) => {
            const parts = Array.isArray(p.part) ? p.part : [p.part];
            return parts.includes(partNumber);
          }).map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleDurationPreset(preset.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                durationSeconds === preset.value
                  ? "bg-purple-600 text-white border-2 border-purple-600"
                  : "bg-white border-2 border-purple-200 text-purple-700 hover:border-purple-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold text-purple-900 mb-2">
            Custom Duration (seconds)
          </label>
          <input
            type="number"
            title="Custom duration in seconds"
            min={10}
            max={300}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-purple-700 mt-1">
            {Math.round(durationSeconds / 60)} min {durationSeconds % 60} sec
          </p>
        </div>
      </div>

      {/* Cue Card Builder (Part 2 Only) */}
      {partNumber === 2 && cueCard && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-amber-700" />
            <p className="font-semibold text-amber-900">Cue Card Template</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">
              Cue Card Topic
            </label>
            <input
              type="text"
              title="Cue card topic"
              value={cueCard.topic}
              onChange={(e) =>
                setCueCard({ ...cueCard, topic: e.target.value })
              }
              placeholder="e.g., Describe a memorable event..."
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-amber-900">
                Bullet Points
              </label>
              <button
                type="button"
                onClick={handleAddBulletPoint}
                title="Add bullet point"
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="space-y-2">
              {cueCard.bulletPoints.map((bullet, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    type="text"
                    title={`Bullet point ${idx + 1}`}
                    value={bullet}
                    onChange={(e) => handleUpdateBulletPoint(idx, e.target.value)}
                    placeholder={`Bullet point ${idx + 1}...`}
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBulletPoint(idx)}
                    title="Remove this bullet point"
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-700 mt-2">
              Keep 3-5 bullet points. These will appear on the cue card given to students.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">
              Follow-up Question
            </label>
            <input
              type="text"
              title="Follow-up question"
              value={cueCard.followUpQuestion}
              onChange={(e) =>
                setCueCard({ ...cueCard, followUpQuestion: e.target.value })
              }
              placeholder="e.g., What did you learn from this...?"
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* Marking Guide */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-green-700" />
          <p className="font-semibold text-green-900">Marking Guide (Band 8+)</p>
        </div>

        <div className="space-y-3">
          {(Object.entries(markingGuide) as Array<[keyof typeof markingGuide, string]>).map(
            ([criterion, description]) => (
              <div key={criterion}>
                <label className="block text-sm font-semibold text-green-900 capitalize mb-1">
                  {criterion}
                </label>
                <textarea
                  title={`Marking guide for ${criterion}`}
                  value={description}
                  onChange={(e) => handleUpdateMarkingGuide(criterion, e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            )
          )}
        </div>

        <p className="text-xs text-green-700">
          These criteria will be used for evaluation and AI scoring
        </p>
      </div>

      {/* Sample Answer */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Sample Answer (Optional)
        </label>
        <textarea
          title="Sample answer for reference"
          value={sampleAnswer}
          onChange={(e) => setSampleAnswer(e.target.value)}
          placeholder="Provide a sample/model answer for examiners reference..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          title="Cancel and close form"
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !questionText}
          title={!questionText ? "Question text is required" : "Save this question"}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving ? "Saving..." : "Add Question"}
        </button>
      </div>
    </form>
  );
}

// Export for use in modals
export default SpeakingQuestionForm;
export { INSTRUCTION_TEMPLATES, MARKING_GUIDE_TEMPLATES, DEFAULT_CUE_CARD };
