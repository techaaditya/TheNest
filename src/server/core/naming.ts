// Community naming of each mutation via native Reddit comments: a naming
// thread opens as a top-level comment on the Nest's post, replies compete by
// score, and the leader must hold the top spot for the final hour before the
// window can close (doc §9) — guarding against Reddit's fuzzed/delayed vote
// scores flipping the outcome right at the deadline.

import { reddit, redis } from '@devvit/web/server';
import { assertT1, assertT3 } from '@devvit/shared-types/tid.js';
import type {
  MutationRecord,
  NamingStatusResponse,
  NamingWindow,
} from '../../shared/types';
import {
  NAMING_FINAL_HOLD_HOURS,
  NAMING_OPEN_RATE_LIMIT_PER_DAY,
  NAMING_WINDOW_HOURS,
} from '../../shared/config';
import {
  activeNamingKey,
  namingOpenSetKey,
  namingRateLimitKey,
  namingWindowKey,
} from './keys';
import { isNameAllowed, normalizeName } from './moderation';
import { getNestState, saveNestState } from './nest';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const openSetMember = (subredditId: string, mutationId: string): string =>
  `${subredditId}:${mutationId}`;

const namingThreadBody = (mutation: MutationRecord): string =>
  `The Nest just mutated: its **${mutation.traitChanged}** changed to **${mutation.newValue}**!\n\n` +
  `Reply with a name for this new look. The top-voted reply wins once it's held ` +
  `the lead for the final hour of the ${NAMING_WINDOW_HOURS}h naming window.`;

/**
 * Opens a naming thread for a freshly-applied mutation, subject to a
 * per-subreddit daily rate limit. No-ops if the Nest's postId isn't known yet
 * (defensive: should only happen if a Nest was created before its install
 * trigger ran) or if the rate limit is already exhausted.
 */
export const openNamingWindow = async (
  subredditId: string,
  postId: string,
  mutation: MutationRecord
): Promise<void> => {
  if (!postId) return;

  const now = Date.now();
  const rateLimitKey = namingRateLimitKey(subredditId);
  await redis.zRemRangeByScore(rateLimitKey, 0, now - DAY_MS);
  const openedRecently = await redis.zCard(rateLimitKey);
  if (openedRecently >= NAMING_OPEN_RATE_LIMIT_PER_DAY) return;

  assertT3(postId);
  const comment = await reddit.submitComment({
    id: postId,
    text: namingThreadBody(mutation),
  });

  const window: NamingWindow = {
    mutationId: mutation.mutationId,
    subredditId,
    threadId: comment.id,
    opensAt: new Date(now).toISOString(),
    closesAt: new Date(now + NAMING_WINDOW_HOURS * HOUR_MS).toISOString(),
    leaderCommentId: null,
    leaderSinceTs: null,
    status: 'open',
  };

  await redis.zAdd(rateLimitKey, {
    member: mutation.mutationId,
    score: now,
  });
  await redis.set(namingWindowKey(subredditId, mutation.mutationId), JSON.stringify(window));
  await redis.set(activeNamingKey(subredditId), mutation.mutationId);
  await redis.zAdd(namingOpenSetKey(), {
    member: openSetMember(subredditId, mutation.mutationId),
    score: now,
  });
};

export const getNamingStatus = async (
  subredditId: string
): Promise<NamingStatusResponse> => {
  const nest = await getNestState(subredditId);
  const latestMutation = nest.mutationHistory.at(-1) ?? null;

  const activeMutationId = await redis.get(activeNamingKey(subredditId));
  if (!activeMutationId) {
    return { type: 'naming', latestMutation, window: null };
  }

  const raw = await redis.get(namingWindowKey(subredditId, activeMutationId));
  const window = raw ? (JSON.parse(raw) as NamingWindow) : null;
  return { type: 'naming', latestMutation, window };
};

/** A single valid, moderation-passed reply competing to name the mutation. */
export type NameCandidate = {
  commentId: string;
  name: string;
  score: number;
};

export type FinalizeDecision =
  | {
      action: 'extend';
      leaderCommentId: string;
      leaderSinceTs: number;
      closesAtMs: number;
    }
  | { action: 'finalize'; name: string | null; leaderCommentId: string | null }
  | { action: 'wait' };

/**
 * Pure decision function for one sweep of one naming window, given its
 * current leader-hold state and the current best candidates. Kept free of
 * Redis/Reddit I/O so it's fully unit-testable.
 */
export const decideFinalization = (
  window: Pick<NamingWindow, 'closesAt' | 'leaderCommentId' | 'leaderSinceTs'>,
  candidates: readonly NameCandidate[],
  now: number
): FinalizeDecision => {
  const closesAtMs = Date.parse(window.closesAt);
  const leader = candidates.reduce<NameCandidate | null>(
    (best, candidate) =>
      best === null || candidate.score > best.score ? candidate : best,
    null
  );

  if (!leader) {
    return now >= closesAtMs
      ? { action: 'finalize', name: null, leaderCommentId: null }
      : { action: 'wait' };
  }

  if (leader.commentId !== window.leaderCommentId) {
    // Leader is new (or first-ever) — the hold timer restarts, so make sure
    // the window stays open at least NAMING_FINAL_HOLD_HOURS past now.
    return {
      action: 'extend',
      leaderCommentId: leader.commentId,
      leaderSinceTs: now,
      closesAtMs: Math.max(closesAtMs, now + NAMING_FINAL_HOLD_HOURS * HOUR_MS),
    };
  }

  const heldLongEnough =
    window.leaderSinceTs !== null &&
    now - window.leaderSinceTs >= NAMING_FINAL_HOLD_HOURS * HOUR_MS;

  if (now < closesAtMs) {
    return { action: 'wait' };
  }

  if (heldLongEnough) {
    return {
      action: 'finalize',
      name: leader.name,
      leaderCommentId: leader.commentId,
    };
  }

  // Due to close, but the current leader hasn't held the lead long enough —
  // extend just until it will have.
  const leaderSinceTs = window.leaderSinceTs ?? now;
  return {
    action: 'extend',
    leaderCommentId: leader.commentId,
    leaderSinceTs,
    closesAtMs: leaderSinceTs + NAMING_FINAL_HOLD_HOURS * HOUR_MS,
  };
};

const loadCandidates = async (
  threadId: string
): Promise<NameCandidate[]> => {
  assertT1(threadId);
  const rootComment = await reddit.getCommentById(threadId);
  const replies = await rootComment.replies.all();

  const candidates: NameCandidate[] = [];
  for (const reply of replies) {
    if (reply.removed || reply.spam) continue;
    const name = normalizeName(reply.body);
    if (!isNameAllowed(name)) continue;
    candidates.push({ commentId: reply.id, name, score: reply.score });
  }
  return candidates;
};

const applyWinningName = async (
  subredditId: string,
  mutationId: string,
  name: string | null
): Promise<void> => {
  const nest = await getNestState(subredditId);
  const mutationHistory = nest.mutationHistory.map((record) =>
    record.mutationId === mutationId
      ? { ...record, name, namedByVote: name !== null }
      : record
  );
  await saveNestState({ ...nest, mutationHistory });
};

const closeWindow = async (
  subredditId: string,
  mutationId: string
): Promise<void> => {
  await redis.del(namingWindowKey(subredditId, mutationId));
  await redis.del(activeNamingKey(subredditId));
  await redis.zRem(namingOpenSetKey(), [openSetMember(subredditId, mutationId)]);
};

const sweepOneWindow = async (
  subredditId: string,
  mutationId: string,
  now: number
): Promise<void> => {
  const raw = await redis.get(namingWindowKey(subredditId, mutationId));
  if (!raw) {
    await redis.zRem(namingOpenSetKey(), [openSetMember(subredditId, mutationId)]);
    return;
  }
  const window = JSON.parse(raw) as NamingWindow;
  const candidates = await loadCandidates(window.threadId);
  const decision = decideFinalization(window, candidates, now);

  if (decision.action === 'wait') return;

  if (decision.action === 'finalize') {
    await applyWinningName(subredditId, mutationId, decision.name);
    await closeWindow(subredditId, mutationId);
    return;
  }

  const nextWindow: NamingWindow = {
    ...window,
    leaderCommentId: decision.leaderCommentId,
    leaderSinceTs: decision.leaderSinceTs,
    closesAt: new Date(decision.closesAtMs).toISOString(),
    status: 'finalizing',
  };
  await redis.set(namingWindowKey(subredditId, mutationId), JSON.stringify(nextWindow));
};

/** Sweeps every open naming window across all subreddits, finalizing or
 * extending each per decideFinalization. Runs hourly. */
export const sweepNamingWindows = async (now: number): Promise<void> => {
  const members = await redis.zRange(namingOpenSetKey(), 0, -1);
  for (const { member } of members) {
    const [subredditId, mutationId] = member.split(':');
    if (!subredditId || !mutationId) continue;
    await sweepOneWindow(subredditId, mutationId, now);
  }
};

/** Moderator override: force-closes the subreddit's active naming window
 * immediately, with no winning name. */
export const rejectActiveNamingWindow = async (
  subredditId: string
): Promise<boolean> => {
  const activeMutationId = await redis.get(activeNamingKey(subredditId));
  if (!activeMutationId) return false;
  await closeWindow(subredditId, activeMutationId);
  return true;
};
