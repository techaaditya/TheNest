// Recent-activity feed: a capped, most-recent-first list of care actions per
// subreddit, so a short first visit still shows something dynamic (doc §14).

import { redis } from '@devvit/web/server';
import type { ActivityItem, CareActionType } from '../../shared/types';
import { ACTIVITY_BUFFER_SIZE } from '../../shared/config';
import { activityKey } from './keys';

export const pushActivity = async (
  subredditId: string,
  userDisplay: string,
  actionType: CareActionType
): Promise<void> => {
  const key = activityKey(subredditId);
  const ts = Date.now();
  const item: ActivityItem = { userDisplay, actionType, ts };

  await redis.zAdd(key, { member: JSON.stringify(item), score: ts });
  // Keep only the most recent ACTIVITY_BUFFER_SIZE entries.
  await redis.zRemRangeByRank(key, 0, -1 * (ACTIVITY_BUFFER_SIZE + 1));
};

export const getRecentActivity = async (
  subredditId: string
): Promise<ActivityItem[]> => {
  const entries = await redis.zRange(activityKey(subredditId), 0, -1);
  return entries
    .map((entry) => JSON.parse(entry.member) as ActivityItem)
    .sort((a, b) => b.ts - a.ts);
};
