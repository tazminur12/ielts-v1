import { redirect } from "next/navigation";

/**
 * Entry URL used across the app: /exam?testId=… (&mode=practice for practice).
 * Resolves to the computer-delivered take flow; bare /exam sends users to mock tests.
 */
export default async function ExamPage({
  searchParams,
}: {
  searchParams: Promise<{ testId?: string; mode?: string }>;
}) {
  const { testId, mode } = await searchParams;

  if (testId) {
    const q = new URLSearchParams({ testId });
    if (mode) q.set("mode", mode);
    redirect(`/exam/take?${q.toString()}`);
  }

  redirect("/mock-tests");
}
