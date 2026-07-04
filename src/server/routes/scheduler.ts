import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { getInstalledSubreddits } from '../core/nest';
import { runDailyTickForSubreddit } from '../core/mutation';
import { sweepNamingWindows } from '../core/naming';

export const schedulerRoutes = new Hono();

const todayUTC = (): string => new Date().toISOString().slice(0, 10);

schedulerRoutes.post('/daily-tick', async (c) => {
  // The platform posts TaskRequest{name,data}; the daily tick doesn't need any of it.
  await c.req.json<TaskRequest>().catch(() => undefined);

  const date = todayUTC();
  const subredditIds = await getInstalledSubreddits();

  for (const subredditId of subredditIds) {
    await runDailyTickForSubreddit(subredditId, date);
  }

  return c.json<TaskResponse>({});
});

schedulerRoutes.post('/naming-finalize', async (c) => {
  await c.req.json<TaskRequest>().catch(() => undefined);

  await sweepNamingWindows(Date.now());

  return c.json<TaskResponse>({});
});
