import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import Question from "@/models/Question";

type ParityResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    module: string;
    examType: string;
  } & Record<string, unknown>;
};

type Module = "full" | "listening" | "reading" | "writing" | "speaking";

function countWords(input: string): number {
  return String(input || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function moduleFromSectionType(sectionType: string): Module {
  if (sectionType === "listening_part") return "listening";
  if (sectionType === "reading_passage") return "reading";
  if (sectionType === "writing_task") return "writing";
  return "speaking";
}

export async function validateIeltsParityByTestId(testId: string): Promise<ParityResult> {
  await connectDB();

  const test: any = await Test.findById(testId).lean();
  if (!test) {
    return {
      ok: false,
      errors: ["Test not found"],
      warnings: [],
      summary: { module: "unknown", examType: "unknown" },
    };
  }

  const testModule = String(test.module || "").toLowerCase() as Module;
  const examType = String(test.examType || "").toLowerCase();

  const sections: any[] = await Section.find({ testId }).lean();
  const questions: any[] = await Question.find({ testId }).select("sectionId questionType correctAnswer options speakingPrompt speakingDuration").lean();

  const errors: string[] = [];
  const warnings: string[] = [];

  const byType = new Map<string, any[]>();
  for (const s of sections) {
    const t = String(s.sectionType);
    byType.set(t, [...(byType.get(t) || []), s]);
  }

  const sectionTypeById = new Map<string, string>(sections.map((s) => [String(s._id), String(s.sectionType)]));

  const qBySection = new Map<string, any[]>();
  for (const q of questions) {
    const sid = String(q.sectionId || "");
    if (!sid) continue;
    qBySection.set(sid, [...(qBySection.get(sid) || []), q]);
  }

  const isObjective = (q: any) => {
    const t = String(q.questionType);
    return t !== "essay" && t !== "speaking";
  };

  const validateObjectiveBasics = (qs: any[], label: string) => {
    for (const q of qs) {
      const t = String(q.questionType);
      if (!isObjective(q)) continue;
      if (q.correctAnswer == null || String(q.correctAnswer).trim().length === 0) {
        errors.push(`${label}: missing correctAnswer for an objective question.`);
        break;
      }
      if (t === "multiple_choice") {
        const opts = Array.isArray(q.options) ? q.options : [];
        if (opts.length !== 4) {
          errors.push(`${label}: multiple_choice must include exactly 4 options.`);
          break;
        }
        const ca = String(q.correctAnswer).trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(ca)) {
          errors.push(`${label}: multiple_choice correctAnswer must be A/B/C/D.`);
          break;
        }
      }
    }
  };

  const validateListening = () => {
    const secs = (byType.get("listening_part") || []).slice().sort((a, b) => toInt(a.partNumber || a.order) - toInt(b.partNumber || b.order));
    if (secs.length !== 4) errors.push(`Listening: expected 4 sections, found ${secs.length}.`);
    const expectedParts = [1, 2, 3, 4];
    for (const expected of expectedParts) {
      const sec = secs.find((s) => toInt(s.partNumber || s.order) === expected);
      if (!sec) {
        errors.push(`Listening: missing partNumber ${expected}.`);
        continue;
      }
      const qs = qBySection.get(String(sec._id)) || [];
      const objective = qs.filter(isObjective);
      if (objective.length !== 10) {
        errors.push(`Listening part ${expected}: expected 10 objective questions, found ${objective.length}.`);
      }
      const transcript = String(sec.audioTranscript || sec.passageText || "").trim();
      const hasAudio = typeof sec.audioUrl === "string" && sec.audioUrl.trim().length > 0;
      if (!hasAudio && transcript.length < 50) {
        warnings.push(`Listening part ${expected}: add audioUrl or a transcript (audioTranscript).`);
      }
      validateObjectiveBasics(objective, `Listening part ${expected}`);
    }
  };

  const validateReading = () => {
    const secs = (byType.get("reading_passage") || []).slice().sort((a, b) => toInt(a.partNumber || a.order) - toInt(b.partNumber || b.order));
    if (secs.length !== 3) errors.push(`Reading: expected 3 passages, found ${secs.length}.`);
    const dist = [13, 13, 14];
    for (let i = 0; i < 3; i++) {
      const expectedPart = i + 1;
      const sec = secs.find((s) => toInt(s.partNumber || s.order) === expectedPart);
      if (!sec) {
        errors.push(`Reading: missing passage partNumber ${expectedPart}.`);
        continue;
      }
      const qs = qBySection.get(String(sec._id)) || [];
      const objective = qs.filter(isObjective);
      if (objective.length !== dist[i]) {
        errors.push(`Reading passage ${expectedPart}: expected ${dist[i]} objective questions, found ${objective.length}.`);
      }
      const passage = String(sec.passageText || "").trim();
      const wc = countWords(passage);
      if (wc < 700 || wc > 1000) {
        errors.push(`Reading passage ${expectedPart}: passageText must be 700–1000 words (found ${wc}).`);
      }
      validateObjectiveBasics(objective, `Reading passage ${expectedPart}`);
    }
  };

  const validateWriting = () => {
    const secs = (byType.get("writing_task") || []).slice().sort((a, b) => toInt(a.partNumber || a.order) - toInt(b.partNumber || b.order));
    if (secs.length !== 2) errors.push(`Writing: expected 2 tasks, found ${secs.length}.`);
    const expected = [1, 2];
    for (const pn of expected) {
      const sec = secs.find((s) => toInt(s.partNumber || s.order) === pn);
      if (!sec) {
        errors.push(`Writing: missing task partNumber ${pn}.`);
        continue;
      }
      const qs = qBySection.get(String(sec._id)) || [];
      const essays = qs.filter((q) => String(q.questionType) === "essay");
      if (essays.length !== 1) errors.push(`Writing task ${pn}: expected exactly 1 essay question, found ${essays.length}.`);
      const inst = String(sec.instructions || "").toLowerCase();
      if (pn === 1 && !inst.includes("20")) errors.push(`Writing task 1: instructions must mention 20 minutes.`);
      if (pn === 2 && !inst.includes("40")) errors.push(`Writing task 2: instructions must mention 40 minutes.`);
    }
  };

  const validateSpeaking = () => {
    const secs = (byType.get("speaking_part") || []).slice().sort((a, b) => toInt(a.partNumber || a.order) - toInt(b.partNumber || b.order));
    if (secs.length !== 3) errors.push(`Speaking: expected 3 parts, found ${secs.length}.`);
    const expected = [1, 2, 3];
    for (const pn of expected) {
      const sec = secs.find((s) => toInt(s.partNumber || s.order) === pn);
      if (!sec) {
        errors.push(`Speaking: missing partNumber ${pn}.`);
        continue;
      }
      const qs = qBySection.get(String(sec._id)) || [];
      const speakingQs = qs.filter((q) => String(q.questionType) === "speaking");
      if (pn === 2) {
        if (speakingQs.length !== 1) errors.push(`Speaking part 2: expected exactly 1 speaking question, found ${speakingQs.length}.`);
        const q = speakingQs[0];
        if (!q?.speakingPrompt || String(q.speakingPrompt).trim().length === 0) errors.push("Speaking part 2: missing speakingPrompt.");
        if (Number(q?.speakingDuration) !== 120) errors.push("Speaking part 2: speakingDuration must be 120 seconds.");
      } else {
        if (speakingQs.length < 1) errors.push(`Speaking part ${pn}: expected speaking questions, found none.`);
      }
    }
  };

  const enforceFull = testModule === "full" && examType === "mock";
  const enforcePracticeModule = examType === "practice" && ["listening", "reading", "writing", "speaking"].includes(testModule);

  if (enforceFull) {
    validateListening();
    validateReading();
    validateWriting();
    validateSpeaking();
  } else if (enforcePracticeModule) {
    if (testModule === "listening") validateListening();
    if (testModule === "reading") validateReading();
    if (testModule === "writing") validateWriting();
    if (testModule === "speaking") validateSpeaking();
  } else {
    warnings.push("This test is not configured for strict official IELTS parity enforcement.");
  }

  const ok = errors.length === 0;

  const summary: ParityResult["summary"] = {
    module: testModule,
    examType,
    sections: {
      listening: (byType.get("listening_part") || []).length,
      reading: (byType.get("reading_passage") || []).length,
      writing: (byType.get("writing_task") || []).length,
      speaking: (byType.get("speaking_part") || []).length,
    },
    questionCounts: {
      listeningObjective: questions.filter((q) => moduleFromSectionType(sectionTypeById.get(String(q.sectionId)) || "") === "listening" && isObjective(q)).length,
      readingObjective: questions.filter((q) => moduleFromSectionType(sectionTypeById.get(String(q.sectionId)) || "") === "reading" && isObjective(q)).length,
      writingEssay: questions.filter((q) => String(q.questionType) === "essay").length,
      speaking: questions.filter((q) => String(q.questionType) === "speaking").length,
    },
  };

  return { ok, errors, warnings, summary };
}
