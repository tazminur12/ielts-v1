/**
 * Effective timed length in minutes for a test (used by exam UI + attempt resume/expiry).
 * DB `duration` is authoritative when > 0. Practice with 0 stays untimed; mock with 0 uses module defaults.
 */
export type TestDurationSource = {
  duration?: number | null;
  examType?: string;
  module?: string;
};

export function effectiveTestDurationMinutes(test: TestDurationSource): number {
  const fromDb = Number(test?.duration);
  if (Number.isFinite(fromDb) && fromDb > 0) return fromDb;
  if (test?.examType === "practice") return 0;
  switch (test?.module ?? "") {
    case "listening":
      return 30;
    case "reading":
      return 60;
    case "writing":
      return 60;
    case "speaking":
      return 15;
    case "full":
      return 165;
    default:
      return 60;
  }
}
