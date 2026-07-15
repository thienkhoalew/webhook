import { getNextRetryAt } from './retry-policy.js';

describe('retry policy', () => {
  const now = Date.parse('2026-07-15T00:00:00.000Z');

  it.each([
    [1, 60_000],
    [2, 5 * 60_000],
    [3, 30 * 60_000],
  ])('schedules attempt %i after %i ms', (attempt, delay) => {
    expect(getNextRetryAt(attempt, now)?.getTime()).toBe(now + delay);
  });

  it('marks fourth failure final', () => {
    expect(getNextRetryAt(4, now)).toBeNull();
  });
});
