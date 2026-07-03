import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { ErrorResponse, InitResponse } from '../../shared/types';
import { ACTION_CAPS } from '../../shared/config';
import { getNestState } from '../core/nest';

export const api = new Hono();

api.get('/init', async (c) => {
  const { subredditId } = context;

  if (!subredditId) {
    console.error('API Init Error: subredditId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'subredditId is required but missing from context',
      },
      400
    );
  }

  try {
    const nest = await getNestState(subredditId);

    return c.json<InitResponse>({
      type: 'init',
      nest,
      // Care actions land in a later phase; until then nothing has been spent today.
      remaining: { ...ACTION_CAPS },
      activity: [],
    });
  } catch (error) {
    console.error(`API Init Error for subreddit ${subredditId}:`, error);
    const message =
      error instanceof Error
        ? `Initialization failed: ${error.message}`
        : 'Unknown error during initialization';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});
