// Deterministic mood -> mutation engine and the daily tick orchestration that
// applies it. computeMutationRoll is pure: same accumulator + traits + date
// always produces the same result, so it's fully inspectable (GET /api/why)
// and reproducible for tests — no hidden randomness beyond a seed derived
// from subredditId + date.

import { redis } from '@devvit/web/server';
import type {
  AppendageTrait,
  BaseForm,
  ColorTrait,
  MutationRecord,
  NestState,
  PatternTrait,
  Traits,
  WhyMutationInput,
  WhyResponse,
} from '../../shared/types';
import {
  ACTION_DIVERSITY_BONUS,
  MIN_DAYS_BETWEEN_MUTATIONS,
  MOOD_SCORE_WEIGHTS,
  MUTABLE_TRAIT_SLOTS,
  MUTATION_SCORE_THRESHOLD,
  TRAIT_SPACE,
} from '../../shared/config';
import { whyKey } from './keys';
import {
  type MoodAccumulator,
  getAccumulatedMood,
  resetMoodAccumulators,
} from './care';
import { getNestState, saveNestState } from './nest';
import { openNamingWindow } from './naming';

/** Deterministic PRNG (mulberry32) so the roll is reproducible for a given seed. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashSeed = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash;
};

const pickRandom = <T>(items: readonly T[], rand: () => number): T => {
  const index = Math.floor(rand() * items.length);
  const item = items[index];
  if (item === undefined) {
    throw new Error('pickRandom called with an empty array');
  }
  return item;
};

export type SlotMutation =
  | { traitChanged: 'base'; previousValue: BaseForm; newValue: BaseForm }
  | { traitChanged: 'color'; previousValue: ColorTrait; newValue: ColorTrait }
  | {
      traitChanged: 'pattern';
      previousValue: PatternTrait;
      newValue: PatternTrait;
    }
  | {
      traitChanged: 'appendage';
      previousValue: AppendageTrait;
      newValue: AppendageTrait;
    };

const rollSlotMutation = (traits: Traits, rand: () => number): SlotMutation => {
  const slot = pickRandom(MUTABLE_TRAIT_SLOTS, rand);
  switch (slot) {
    case 'base': {
      const options = TRAIT_SPACE.base.filter((value) => value !== traits.base);
      return {
        traitChanged: 'base',
        previousValue: traits.base,
        newValue: pickRandom(options, rand),
      };
    }
    case 'color': {
      const options = TRAIT_SPACE.color.filter(
        (value) => value !== traits.color
      );
      return {
        traitChanged: 'color',
        previousValue: traits.color,
        newValue: pickRandom(options, rand),
      };
    }
    case 'pattern': {
      const options = TRAIT_SPACE.pattern.filter(
        (value) => value !== traits.pattern
      );
      return {
        traitChanged: 'pattern',
        previousValue: traits.pattern,
        newValue: pickRandom(options, rand),
      };
    }
    case 'appendage': {
      const options = TRAIT_SPACE.appendage.filter(
        (value) => value !== traits.appendage
      );
      return {
        traitChanged: 'appendage',
        previousValue: traits.appendage,
        newValue: pickRandom(options, rand),
      };
    }
  }
};

const applyMutationToTraits = (
  traits: Traits,
  mutation: SlotMutation
): Traits => {
  switch (mutation.traitChanged) {
    case 'base':
      return { ...traits, base: mutation.newValue };
    case 'color':
      return { ...traits, color: mutation.newValue };
    case 'pattern':
      return { ...traits, pattern: mutation.newValue };
    case 'appendage':
      return { ...traits, appendage: mutation.newValue };
  }
};

export type MutationRollInput = {
  accumulator: MoodAccumulator;
  daysSinceLastMutation: number;
};

export type MutationRollResult = {
  dailyMoodScore: number;
  diversityBonus: number;
  mutated: boolean;
  mutation: SlotMutation | null;
};

export const computeMutationRoll = (
  subredditId: string,
  date: string,
  traits: Traits,
  input: MutationRollInput
): MutationRollResult => {
  const { accumulator, daysSinceLastMutation } = input;

  const diversityBonus =
    accumulator.feedCount > 0 &&
    accumulator.petCount > 0 &&
    accumulator.playCount > 0
      ? ACTION_DIVERSITY_BONUS
      : 0;

  const dailyMoodScore =
    MOOD_SCORE_WEIGHTS.contentment * accumulator.contentmentDelta +
    MOOD_SCORE_WEIGHTS.affection * accumulator.affectionDelta +
    MOOD_SCORE_WEIGHTS.energy * accumulator.energyDelta +
    diversityBonus;

  const eligible =
    dailyMoodScore >= MUTATION_SCORE_THRESHOLD &&
    daysSinceLastMutation >= MIN_DAYS_BETWEEN_MUTATIONS;

  if (!eligible) {
    return { dailyMoodScore, diversityBonus, mutated: false, mutation: null };
  }

  const rand = mulberry32(hashSeed(`${subredditId}:${date}`));
  const mutation = rollSlotMutation(traits, rand);

  return { dailyMoodScore, diversityBonus, mutated: true, mutation };
};

const daysBetween = (fromDateStr: string, toDateStr: string): number => {
  const from = Date.parse(fromDateStr.slice(0, 10));
  const to = Date.parse(toDateStr.slice(0, 10));
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
};

/** Runs the full daily tick for one subreddit: rolls a mutation, applies it if eligible, persists the "why" breakdown, and resets the day's mood accumulator. */
export const runDailyTickForSubreddit = async (
  subredditId: string,
  date: string
): Promise<WhyResponse> => {
  const state = await getNestState(subredditId);
  const accumulator = await getAccumulatedMood(subredditId, date);

  const lastMutationDate =
    state.mutationHistory.at(-1)?.date ?? state.createdAt;
  const daysSinceLastMutation = daysBetween(lastMutationDate, date);

  const roll = computeMutationRoll(subredditId, date, state.traits, {
    accumulator,
    daysSinceLastMutation,
  });

  const nowISO = new Date().toISOString();
  let nextState: NestState = { ...state, lastTickAt: nowISO };
  let appliedMutation: MutationRecord | null = null;

  if (roll.mutated && roll.mutation) {
    const record: MutationRecord = {
      mutationId: `M-${state.mutationHistory.length + 1}`,
      date,
      traitChanged: roll.mutation.traitChanged,
      previousValue: roll.mutation.previousValue,
      newValue: roll.mutation.newValue,
      name: null,
      namedByVote: false,
    };
    nextState = {
      ...nextState,
      traits: applyMutationToTraits(state.traits, roll.mutation),
      mutationHistory: [...state.mutationHistory, record],
    };
    appliedMutation = record;
  }

  await saveNestState(nextState);

  if (appliedMutation) {
    await openNamingWindow(subredditId, nextState.postId, appliedMutation);
  }

  const input: WhyMutationInput = {
    contentmentDelta: accumulator.contentmentDelta,
    affectionDelta: accumulator.affectionDelta,
    energyDelta: accumulator.energyDelta,
    diversityBonus: roll.diversityBonus,
    dailyMoodScore: roll.dailyMoodScore,
    daysSinceLastMutation,
    threshold: MUTATION_SCORE_THRESHOLD,
    mutated: roll.mutated,
  };
  const why: WhyResponse = {
    type: 'why',
    lastTickAt: nowISO,
    input,
    appliedMutation,
  };

  await redis.set(whyKey(subredditId), JSON.stringify(why));
  await resetMoodAccumulators(subredditId, date);

  return why;
};

export const getWhyInfo = async (
  subredditId: string
): Promise<WhyResponse | null> => {
  const raw = await redis.get(whyKey(subredditId));
  return raw ? (JSON.parse(raw) as WhyResponse) : null;
};
