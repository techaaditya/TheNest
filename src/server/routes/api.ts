import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  ActivityResponse,
  CareActionErrorResponse,
  CareActionRequest,
  CareActionResponse,
  CareActionType,
  ErrorResponse,
  InitResponse,
} from '../../shared/types';
import { getNestState } from '../core/nest';
import { getRecentActivity, pushActivity } from '../core/activity';
import { getRemainingActionsToday, spendCareAction } from '../core/care';

export const api = new Hono();

const CARE_ACTION_TYPES: ReadonlySet<string> = new Set(['feed', 'pet', 'play']);

api.get('/init', async (c) => {
  const { subredditId, userId } = context;

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
    const [nest, remaining, activity] = await Promise.all([
      getNestState(subredditId),
      userId
        ? getRemainingActionsToday(subredditId, userId)
        : Promise.resolve({ feed: 0, pet: 0, play: 0 }),
      getRecentActivity(subredditId),
    ]);

    return c.json<InitResponse>({ type: 'init', nest, remaining, activity });
  } catch (error) {
    console.error(`API Init Error for subreddit ${subredditId}:`, error);
    const message =
      error instanceof Error
        ? `Initialization failed: ${error.message}`
        : 'Unknown error during initialization';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.get('/activity', async (c) => {
  const { subredditId } = context;

  if (!subredditId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'subredditId is required but missing from context',
      },
      400
    );
  }

  const activity = await getRecentActivity(subredditId);
  return c.json<ActivityResponse>({ type: 'activity', activity });
});

api.post('/care-action', async (c) => {
  const { subredditId, userId, username } = context;

  if (!subredditId || !userId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'A logged-in user and subreddit context are required',
      },
      400
    );
  }

  const body = await c.req.json<CareActionRequest>();
  if (!CARE_ACTION_TYPES.has(body.actionType)) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid actionType' },
      400
    );
  }
  const actionType = body.actionType as CareActionType;

  const result = await spendCareAction(subredditId, userId, actionType);
  if (!result.ok) {
    return c.json<CareActionErrorResponse>({ error: 'daily_cap_reached' }, 429);
  }

  await pushActivity(subredditId, username ?? 'a redditor', actionType);

  return c.json<CareActionResponse>({
    type: 'care-action',
    ok: true,
    remaining: result.remaining,
  });
});
