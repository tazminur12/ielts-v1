import Attempt from "@/models/Attempt";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import { rawScoreToBand } from "@/lib/aiEvaluation";
import { computeRemainingSeconds } from "@/lib/attemptTiming";
import Section from "@/models/Section";

type ActorFilter = { userId: string } | { guestId: string };

export async function submitAttemptById(input: {
  attemptId: string;
  actor: ActorFilter;
  now?: Date;
}): Promise<{ status: "submitted" | "evaluated"; remainingSeconds: number }> {
  const now = input.now ?? new Date();

  const attempt = await Attempt.findOne({ _id: input.attemptId, ...(input.actor as any) });
  if (!attempt) throw new Error("Not found");

  return submitAttemptDoc({
    attempt,
    actor: input.actor,
    now,
  });
}

export async function submitAttemptDoc(input: {
  attempt: any;
  actor: ActorFilter;
  now: Date;
}): Promise<{ status: "submitted" | "evaluated"; remainingSeconds: number }> {
  const attempt = input.attempt;

  if (attempt.status !== "in_progress") {
    return { status: attempt.status, remainingSeconds: 0 };
  }

  const durationSeconds = Number(attempt.durationSeconds || 0);
  const remainingSeconds =
    durationSeconds > 0
      ? computeRemainingSeconds({ startedAt: new Date(attempt.startedAt), durationSeconds, now: input.now })
      : 0;

  const timeSpent =
    durationSeconds > 0
      ? Math.min(durationSeconds, Math.max(0, durationSeconds - remainingSeconds))
      : Math.floor((input.now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);

  const answers = await Answer.find({ attemptId: attempt._id, ...(input.actor as any) });
  const isObjective = ["listening", "reading"].includes(String(attempt.module));
  const isFullMock = String(attempt.module) === "full";

  if (isObjective || isFullMock) {
    const [questions, sections] = await Promise.all([
      Question.find({ testId: attempt.testId }).select("+correctAnswer skill sectionId questionType marks").lean(),
      Section.find({ testId: attempt.testId }).select("_id sectionType").lean(),
    ]);

    const sectionSkill = new Map(
      (sections as any[]).map((s) => [
        String(s._id),
        String(s.sectionType) === "listening_part"
          ? "listening"
          : String(s.sectionType) === "reading_passage"
          ? "reading"
          : String(s.sectionType) === "writing_task"
          ? "writing"
          : "speaking",
      ])
    );

    const answerMap = new Map(answers.map((a: any) => [a.questionId.toString(), a]));
    let rawScore = 0;
    let listeningRaw = 0;
    let readingRaw = 0;
    const objectiveQuestions = (questions as any[]).filter((q) => {
      const skill = q.skill || sectionSkill.get(String(q.sectionId));
      const qt = String(q.questionType);
      if (qt === "essay" || qt === "speaking") return false;
      return skill === "listening" || skill === "reading";
    });

    const listeningQuestions = objectiveQuestions.filter(
      (q) => (q.skill || sectionSkill.get(String(q.sectionId))) === "listening"
    );
    const readingQuestions = objectiveQuestions.filter(
      (q) => (q.skill || sectionSkill.get(String(q.sectionId))) === "reading"
    );

    for (const q of objectiveQuestions) {
      const ans = answerMap.get(String(q._id));
      if (!ans) continue;

      const correctAnswer = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.map((c: string) => c.toLowerCase().trim())
        : [String(q.correctAnswer || "").toLowerCase().trim()];

      let studentAnswer = "";
      if (ans.selectedOption) studentAnswer = String(ans.selectedOption).toLowerCase().trim();
      else if (ans.textAnswer) studentAnswer = String(ans.textAnswer).toLowerCase().trim();
      else if (ans.matchedAnswer) studentAnswer = String(ans.matchedAnswer).toLowerCase().trim();
      else if (ans.booleanAnswer) studentAnswer = String(ans.booleanAnswer).toLowerCase().trim();

      const isCorrect = correctAnswer.includes(studentAnswer);
      const marks = isCorrect ? (q.marks || 1) : 0;

      await Answer.findByIdAndUpdate(ans._id, {
        isCorrect,
        marksAwarded: marks,
        correctAnswer: q.correctAnswer,
      });

      if (isCorrect) {
        rawScore += marks;
        const skill = q.skill || sectionSkill.get(String(q.sectionId));
        if (skill === "listening") listeningRaw += marks;
        if (skill === "reading") readingRaw += marks;
      }
    }

    const totalObjective = listeningQuestions.length + readingQuestions.length;
    const percentageScore = totalObjective > 0 ? Math.round((rawScore / totalObjective) * 100) : 0;

    if (isObjective) {
      const attemptModule = String(attempt.module) as "listening" | "reading";
      const bandScore = rawScoreToBand(rawScore, attemptModule, objectiveQuestions.length);

      await Attempt.findByIdAndUpdate(attempt._id, {
        $set: {
          status: "evaluated",
          submittedAt: input.now,
          timeSpent,
          rawScore,
          percentageScore,
          bandScore,
          overallBand: bandScore,
        },
      });

      return { status: "evaluated", remainingSeconds };
    }

    const listeningBand = rawScoreToBand(listeningRaw, "listening", listeningQuestions.length || 40);
    const readingBand = rawScoreToBand(readingRaw, "reading", readingQuestions.length || 40);

    await Attempt.findByIdAndUpdate(attempt._id, {
      $set: {
        status: "submitted",
        submittedAt: input.now,
        timeSpent,
        rawScore,
        percentageScore,
        sectionBands: {
          ...(attempt.sectionBands || {}),
          listening: listeningBand,
          reading: readingBand,
        },
      },
    });

    return { status: "submitted", remainingSeconds };
  }

  await Attempt.findByIdAndUpdate(attempt._id, {
    $set: {
      status: "submitted",
      submittedAt: input.now,
      timeSpent,
    },
  });

  return { status: "submitted", remainingSeconds };
}
