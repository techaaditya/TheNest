// Subscribes to the per-subreddit care-action channel so other visitors'
// feed/pet/play actions show up live, without polling or a manual refresh.

import { connectRealtime, context, disconnectRealtime } from '@devvit/web/client';
import type { RealtimeCareMessage } from '../shared/types';

const careChannel = (subredditId: string): string =>
  `nest_care_${subredditId}`;

export const subscribeToCareActions = (
  onMessage: (message: RealtimeCareMessage) => void
): (() => void) => {
  const channel = careChannel(context.subredditId);
  connectRealtime<RealtimeCareMessage>({ channel, onMessage });
  return () => disconnectRealtime(channel);
};
