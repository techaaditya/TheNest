import { describe, expect, it } from 'vitest';
import { decideFinalization, type NameCandidate } from './naming';
import { NAMING_FINAL_HOLD_HOURS } from '../../shared/config';

const HOUR_MS = 60 * 60 * 1000;

const windowClosingAt = (closesAtMs: number, leaderCommentId: string | null = null, leaderSinceTs: number | null = null) => ({
  closesAt: new Date(closesAtMs).toISOString(),
  leaderCommentId,
  leaderSinceTs,
});

describe('decideFinalization', () => {
  it('waits (no writes needed) when the window is not due and the leader is unchanged', () => {
    const now = Date.now();
    const window = windowClosingAt(now + HOUR_MS, 'c1', now - HOUR_MS);
    const candidates: NameCandidate[] = [{ commentId: 'c1', name: 'Sprout', score: 10 }];

    expect(decideFinalization(window, candidates, now)).toEqual({ action: 'wait' });
  });

  it('tracks a new leader even before the window is due, without pulling closesAt earlier', () => {
    const now = Date.now();
    const originalClosesAtMs = now + 10 * HOUR_MS;
    const window = windowClosingAt(originalClosesAtMs);
    const candidates: NameCandidate[] = [{ commentId: 'c1', name: 'Sprout', score: 10 }];

    const decision = decideFinalization(window, candidates, now);

    expect(decision.action).toBe('extend');
    if (decision.action === 'extend') {
      expect(decision.leaderCommentId).toBe('c1');
      expect(decision.leaderSinceTs).toBe(now);
      // Original deadline is already further out than the hold window, so it must not move earlier.
      expect(decision.closesAtMs).toBe(originalClosesAtMs);
    }
  });

  it('finalizes with no name when the window is due and no valid candidates exist', () => {
    const now = Date.now();
    const window = windowClosingAt(now - 1);

    expect(decideFinalization(window, [], now)).toEqual({
      action: 'finalize',
      name: null,
      leaderCommentId: null,
    });
  });

  it('extends and resets the hold timer when a new leader takes the top spot', () => {
    const now = Date.now();
    const window = windowClosingAt(now - 1, 'c-old', now - 5 * HOUR_MS);
    const candidates: NameCandidate[] = [
      { commentId: 'c-old', name: 'Sprout', score: 5 },
      { commentId: 'c-new', name: 'Pip', score: 12 },
    ];

    const decision = decideFinalization(window, candidates, now);

    expect(decision.action).toBe('extend');
    if (decision.action === 'extend') {
      expect(decision.leaderCommentId).toBe('c-new');
      expect(decision.leaderSinceTs).toBe(now);
      expect(decision.closesAtMs).toBeGreaterThanOrEqual(
        now + NAMING_FINAL_HOLD_HOURS * HOUR_MS
      );
    }
  });

  it('finalizes once the same leader has held the top spot past the final-hold window', () => {
    const now = Date.now();
    const leaderSinceTs = now - (NAMING_FINAL_HOLD_HOURS + 1) * HOUR_MS;
    const window = windowClosingAt(now - 1, 'c1', leaderSinceTs);
    const candidates: NameCandidate[] = [{ commentId: 'c1', name: 'Sprout', score: 10 }];

    expect(decideFinalization(window, candidates, now)).toEqual({
      action: 'finalize',
      name: 'Sprout',
      leaderCommentId: 'c1',
    });
  });

  it('extends rather than finalizing when the leader has not held long enough yet', () => {
    const now = Date.now();
    const leaderSinceTs = now - 10 * 60 * 1000; // only 10 minutes as leader
    const window = windowClosingAt(now - 1, 'c1', leaderSinceTs);
    const candidates: NameCandidate[] = [{ commentId: 'c1', name: 'Sprout', score: 10 }];

    const decision = decideFinalization(window, candidates, now);

    expect(decision.action).toBe('extend');
    if (decision.action === 'extend') {
      expect(decision.leaderCommentId).toBe('c1');
      expect(decision.closesAtMs).toBe(leaderSinceTs + NAMING_FINAL_HOLD_HOURS * HOUR_MS);
    }
  });

  it('picks the highest-scoring candidate as leader among several', () => {
    const now = Date.now();
    const window = windowClosingAt(now + HOUR_MS);
    const candidates: NameCandidate[] = [
      { commentId: 'low', name: 'Blob', score: 2 },
      { commentId: 'high', name: 'Sprout', score: 9 },
      { commentId: 'mid', name: 'Pip', score: 5 },
    ];

    const decision = decideFinalization(window, candidates, now);
    expect(decision.action).toBe('extend');
    if (decision.action === 'extend') {
      expect(decision.leaderCommentId).toBe('high');
    }
  });
});
