// Broadcasts care actions to every connected client for a subreddit's Nest,
// so other visitors see mood/activity update live without a manual refresh.

import { realtime } from '@devvit/web/server';
import type { RealtimeCareMessage } from '../../shared/types';

export const careChannel = (subredditId: string): string =>
  `nest_care_${subredditId}`;

export const broadcastCareAction = async (
  subredditId: string,
  message: RealtimeCareMessage
): Promise<void> => {
  await realtime.send<RealtimeCareMessage>(careChannel(subredditId), message);
};
