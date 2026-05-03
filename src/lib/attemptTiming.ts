export function computeExpiresAt(input: { startedAt: Date; durationSeconds: number }): Date {
  return new Date(input.startedAt.getTime() + input.durationSeconds * 1000);
}

export function computeRemainingSeconds(input: {
  startedAt: Date;
  durationSeconds: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const elapsed = Math.floor((now.getTime() - input.startedAt.getTime()) / 1000);
  return Math.max(0, input.durationSeconds - elapsed);
}

