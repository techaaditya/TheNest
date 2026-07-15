// Single source of truth for tuning numbers and the curated trait space.
// Imported by both server (mood/mutation engine) and client (display) — never duplicate these values.

import type {
  AppendageTrait,
  BaseForm,
  CareActionType,
  ColorTrait,
  Mood,
  MoodAxis,
  PatternTrait,
  Traits,
  TraitSlot,
} from './types';

/** Server-authoritative daily action caps per user per subreddit. Never trust a client-sent cap. */
export const ACTION_CAPS: Record<CareActionType, number> = {
  feed: 3,
  pet: 2,
  play: 1,
};

/** Which mood axis each care action nudges. */
export const ACTION_MOOD_AXIS: Record<CareActionType, MoodAxis> = {
  feed: 'contentment',
  pet: 'affection',
  play: 'energy',
};

/** How much a single action nudges its mood axis accumulator for the day. */
export const MOOD_NUDGE_PER_ACTION = 4;

/** Weights applied to each mood axis delta when computing the daily mood score. */
export const MOOD_SCORE_WEIGHTS: Record<MoodAxis, number> = {
  contentment: 1,
  affection: 1,
  energy: 1,
};

/** Bonus added to the daily mood score when the community used all three action types, discouraging spamming just one. */
export const ACTION_DIVERSITY_BONUS = 10;

/** Minimum daily mood score required for a mutation to be eligible to roll. */
export const MUTATION_SCORE_THRESHOLD = 30;

/** Minimum days that must pass since the last mutation before another can occur.
 * TEMPORARILY set to 0 for demo seeding on submission day; restore to 2 before final submit. */
export const MIN_DAYS_BETWEEN_MUTATIONS = 0;

/** Naming window duration in hours once a mutation is applied. */
export const NAMING_WINDOW_HOURS = 24;

/** The winning name must hold the top spot for at least this many hours before the window can close, guarding against Reddit's fuzzed/delayed vote scores (doc §9). */
export const NAMING_FINAL_HOLD_HOURS = 1;

/** Max number of naming windows a single subreddit may open per rolling 24h period, to block abuse. */
export const NAMING_OPEN_RATE_LIMIT_PER_DAY = 3;

/** Max entries retained in the recent-activity feed per subreddit. */
export const ACTIVITY_BUFFER_SIZE = 30;

/**
 * The curated trait space. Every combination here is art-directed on purpose —
 * mutations only ever pick from this list, never a free random roll (doc §5.1, the anti-"AI slop" bar).
 */
export const TRAIT_SPACE: {
  base: BaseForm[];
  color: ColorTrait[];
  pattern: PatternTrait[];
  appendage: AppendageTrait[];
} = {
  base: ['sprout', 'pip'],
  color: ['teal', 'coral', 'amber', 'violet'],
  pattern: ['plain', 'speckled', 'striped'],
  appendage: ['none', 'small_wings', 'horns', 'spots'],
};

/** Slots a mutation is allowed to change, in priority order for the roll. */
export const MUTABLE_TRAIT_SLOTS: TraitSlot[] = [
  'color',
  'pattern',
  'appendage',
  'base',
];

/** Starting traits for a brand-new Nest. */
export const DEFAULT_TRAITS: Traits = {
  base: 'sprout',
  color: 'teal',
  pattern: 'plain',
  appendage: 'none',
};

/** Starting mood baseline for a brand-new Nest. */
export const DEFAULT_MOOD: Mood = {
  contentment: 50,
  affection: 50,
  energy: 50,
};

/** TTL (seconds) for a daily action-log Redis key — slightly over 24h as a safe cleanup buffer. */
export const DAILY_ACTION_LOG_TTL_SECONDS = 60 * 60 * 26;
