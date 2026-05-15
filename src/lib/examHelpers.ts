// Helper functions for exam
export function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function sectionIconName(type: "listening_part" | "reading_passage" | "writing_task" | "speaking_part"): string {
  switch (type) {
    case "listening_part": return "headphones";
    case "reading_passage": return "book-open";
    case "writing_task": return "pen-line";
    case "speaking_part": return "message-square";
    default: return "file-text";
  }
}

export function sectionLabel(type: "listening_part" | "reading_passage" | "writing_task" | "speaking_part"): string {
  switch (type) {
    case "listening_part": return "Listening";
    case "reading_passage": return "Reading";
    case "writing_task": return "Writing";
    case "speaking_part": return "Speaking";
    default: return "Section";
  }
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    result += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(result);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 2000,
  onRetry?: (attempt: number) => void
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryableFlag = (err as { retryable?: boolean })?.retryable;
      const status = (err as { status?: number })?.status;
      const isNonRetryableStatus = typeof status === "number" && status >= 400 && status < 500 && status !== 429;
      if (retryableFlag === false || isNonRetryableStatus) throw err;
      if (attempt === maxAttempts) throw err;
      if (onRetry) onRetry(attempt + 1);
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retry attempts failed");
}
