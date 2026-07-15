const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;

export function getNextRetryAt(
  attemptNumber: number,
  now = Date.now(),
): Date | null {
  const delay = RETRY_DELAYS_MS[attemptNumber - 1];
  return delay ? new Date(now + delay) : null;
}
