// Namespaced Redis key builders. Centralizing these avoids key-collision bugs
// across the different subsystems (nest state, rationing, activity, naming).

export const nestKey = (subredditId: string): string => `nest:${subredditId}`;

export const actionsKey = (
  subredditId: string,
  userId: string,
  date: string
): string => `actions:${subredditId}:${userId}:${date}`;

export const moodAccumulatorKey = (subredditId: string, date: string): string =>
  `mood:${subredditId}:${date}`;

export const activityKey = (subredditId: string): string =>
  `activity:${subredditId}`;

export const namingWindowKey = (
  subredditId: string,
  mutationId: string
): string => `naming:${subredditId}:${mutationId}`;

export const namingOpenSetKey = (): string => 'naming:open';

export const namingRateLimitKey = (subredditId: string): string =>
  `ratelimit:naming:${subredditId}`;

/** Maps a subreddit to the mutationId of its currently open naming window, if any. */
export const activeNamingKey = (subredditId: string): string =>
  `naming:active:${subredditId}`;

export const installsKey = (): string => 'installs';

export const whyKey = (subredditId: string): string => `why:${subredditId}`;
