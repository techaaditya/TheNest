// Rationed care actions and the mood accumulator they feed. Caps and identity
// are server-authoritative — the client only ever sends an actionType.

import { redis } from '@devvit/web/server';
import type { CareActionType, DailyActionCounts } from '../../shared/types';
import {
  ACTION_CAPS,
  ACTION_MOOD_AXIS,
  DAILY_ACTION_LOG_TTL_SECONDS,
  MOOD_NUDGE_PER_ACTION,
} from '../../shared/config';
import { actionsKey, moodAccumulatorKey } from './keys';

const todayUTC = (): string => new Date().toISOString().slice(0, 10);

export const getUsedActionsToday = async (
  subredditId: string,
  userId: string
): Promise<DailyActionCounts> => {
  const raw = await redis.hGetAll(actionsKey(subredditId, userId, todayUTC()));
  return {
    feed: Number(raw.feed ?? 0),
    pet: Number(raw.pet ?? 0),
    play: Number(raw.play ?? 0),
  };
};

export const getRemainingActionsToday = async (
  subredditId: string,
  userId: string
): Promise<DailyActionCounts> => {
  const used = await getUsedActionsToday(subredditId, userId);
  return {
    feed: Math.max(0, ACTION_CAPS.feed - used.feed),
    pet: Math.max(0, ACTION_CAPS.pet - used.pet),
    play: Math.max(0, ACTION_CAPS.play - used.play),
  };
};

const bumpMoodAccumulator = async (
  subredditId: string,
  actionType: CareActionType
): Promise<void> => {
  const axis = ACTION_MOOD_AXIS[actionType];
  const key = moodAccumulatorKey(subredditId, todayUTC());
  await redis.hIncrBy(key, axis, MOOD_NUDGE_PER_ACTION);
  await redis.hIncrBy(key, `${actionType}_count`, 1);
  await redis.expire(key, DAILY_ACTION_LOG_TTL_SECONDS);
};

export type SpendActionResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: 'daily_cap_reached' };

/**
 * Spends one care action if the user is under their daily cap. Uses an
 * atomic HINCRBY-then-check-then-compensate pattern so concurrent requests
 * from the same user can't race past the cap.
 */
export const spendCareAction = async (
  subredditId: string,
  userId: string,
  actionType: CareActionType
): Promise<SpendActionResult> => {
  const cap = ACTION_CAPS[actionType];
  const key = actionsKey(subredditId, userId, todayUTC());

  const newUsed = await redis.hIncrBy(key, actionType, 1);
  await redis.expire(key, DAILY_ACTION_LOG_TTL_SECONDS);

  if (newUsed > cap) {
    await redis.hIncrBy(key, actionType, -1);
    return { ok: false, reason: 'daily_cap_reached' };
  }

  await bumpMoodAccumulator(subredditId, actionType);

  return { ok: true, remaining: cap - newUsed };
};
