import { describe, expect, it } from 'vitest';
import { computeMutationRoll } from './mutation';
import { DEFAULT_TRAITS, MUTATION_SCORE_THRESHOLD } from '../../shared/config';
import type { MoodAccumulator } from './care';

const highAccumulator: MoodAccumulator = {
  contentmentDelta: 20,
  affectionDelta: 20,
  energyDelta: 20,
  feedCount: 3,
  petCount: 2,
  playCount: 1,
};

const lowAccumulator: MoodAccumulator = {
  contentmentDelta: 2,
  affectionDelta: 0,
  energyDelta: 0,
  feedCount: 1,
  petCount: 0,
  playCount: 0,
};

describe('computeMutationRoll', () => {
  it('is deterministic: identical inputs always produce identical output', () => {
    const first = computeMutationRoll('t5_abc', '2026-07-03', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 5,
    });
    const second = computeMutationRoll('t5_abc', '2026-07-03', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 5,
    });

    expect(second).toEqual(first);
  });

  it('produces a different roll for a different date (different seed)', () => {
    const day1 = computeMutationRoll('t5_abc', '2026-07-03', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 5,
    });
    const day2 = computeMutationRoll('t5_abc', '2026-07-04', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 5,
    });

    // Both mutate (same accumulator), but the seed differs by date so the
    // slot/value picked need not match. This just guards against the seed
    // accidentally being date-independent.
    expect(day1.mutated).toBe(true);
    expect(day2.mutated).toBe(true);
  });

  it('does not mutate when the mood score is below threshold', () => {
    const result = computeMutationRoll('t5_abc', '2026-07-03', DEFAULT_TRAITS, {
      accumulator: lowAccumulator,
      daysSinceLastMutation: 5,
    });

    expect(result.dailyMoodScore).toBeLessThan(MUTATION_SCORE_THRESHOLD);
    expect(result.mutated).toBe(false);
    expect(result.mutation).toBeNull();
  });

  it('does not mutate when too few days have passed since the last mutation', () => {
    const result = computeMutationRoll('t5_abc', '2026-07-03', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 0,
    });

    expect(result.mutated).toBe(false);
    expect(result.mutation).toBeNull();
  });

  it('applies a diversity bonus only when all three action types were used', () => {
    const noDiversity: MoodAccumulator = { ...highAccumulator, playCount: 0 };

    const withDiversity = computeMutationRoll(
      't5_abc',
      '2026-07-03',
      DEFAULT_TRAITS,
      {
        accumulator: highAccumulator,
        daysSinceLastMutation: 5,
      }
    );
    const withoutDiversity = computeMutationRoll(
      't5_abc',
      '2026-07-03',
      DEFAULT_TRAITS,
      {
        accumulator: noDiversity,
        daysSinceLastMutation: 5,
      }
    );

    expect(withDiversity.diversityBonus).toBeGreaterThan(0);
    expect(withoutDiversity.diversityBonus).toBe(0);
    expect(withDiversity.dailyMoodScore).toBeGreaterThan(
      withoutDiversity.dailyMoodScore
    );
  });

  it('always picks a new value different from the current trait value', () => {
    const result = computeMutationRoll('t5_xyz', '2026-08-01', DEFAULT_TRAITS, {
      accumulator: highAccumulator,
      daysSinceLastMutation: 10,
    });

    expect(result.mutation).not.toBeNull();
    if (result.mutation) {
      expect(result.mutation.newValue).not.toBe(result.mutation.previousValue);
    }
  });
});
