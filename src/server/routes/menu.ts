import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { rejectActiveNamingWindow } from '../core/naming';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/naming-reject', async (c) => {
  try {
    const rejected = await rejectActiveNamingWindow(context.subredditId);
    return c.json<UiResponse>(
      {
        showToast: rejected
          ? 'Naming thread closed with no winning name.'
          : 'No naming thread is currently open.',
      },
      200
    );
  } catch (error) {
    console.error(`Error rejecting naming window: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to reject naming.' }, 400);
  }
});
