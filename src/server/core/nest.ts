// Nest lifecycle: create, read, persist per-subreddit creature state, and track
// which subreddits have the app installed (so the daily tick can iterate all of them).

import { redis } from '@devvit/web/server';
import type { NestState } from '../../shared/types';
import { DEFAULT_MOOD, DEFAULT_TRAITS } from '../../shared/config';
import { installsKey, nestKey } from './keys';

const nowISO = (): string => new Date().toISOString();

const createNestState = (subredditId: string): NestState => ({
  subredditId,
  creatureId: `NEST-${subredditId}`,
  traits: { ...DEFAULT_TRAITS },
  mood: { ...DEFAULT_MOOD },
  mutationHistory: [],
  createdAt: nowISO(),
  lastTickAt: null,
});

export const saveNestState = async (state: NestState): Promise<void> => {
  await redis.set(nestKey(state.subredditId), JSON.stringify(state));
};

export const registerInstall = async (subredditId: string): Promise<void> => {
  await redis.zAdd(installsKey(), { member: subredditId, score: Date.now() });
};

export const getInstalledSubreddits = async (): Promise<string[]> => {
  const members = await redis.zRange(installsKey(), 0, -1);
  return members.map((entry) => entry.member);
};

/** Creates and persists a fresh Nest for a subreddit that doesn't have one yet, and registers the install. */
export const initNestState = async (
  subredditId: string
): Promise<NestState> => {
  const state = createNestState(subredditId);
  await saveNestState(state);
  await registerInstall(subredditId);
  return state;
};

/** Fetches the Nest for a subreddit, initializing one if it doesn't exist yet. */
export const getNestState = async (subredditId: string): Promise<NestState> => {
  const raw = await redis.get(nestKey(subredditId));
  if (!raw) {
    return initNestState(subredditId);
  }
  return JSON.parse(raw) as NestState;
};
