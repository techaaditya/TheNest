## Devvit Phaser Starter

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [Phaser](https://phaser.io/): 2D game engine
- [Hono](https://hono.dev/): For backend logic
- [TypeScript](https://www.typescriptlang.org/): For type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=phaser`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app

## Credits

Thanks to the Phaser team for [providing a great template](https://github.com/phaserjs/template-vite-ts)!

## Architecture Notes (The Nest)

Verified against the installed `@devvit/web@0.13.6` / `devvit@0.13.6` packages (source of truth: `node_modules/@devvit/shared-types/schemas/config-file.v1.d.ts`, which is the exact schema the CLI uses to parse/validate `devvit.json`).

**Scheduler** (`scheduler` export from `@devvit/web/server`, backed by `@devvit/scheduler`):

- Recurring jobs are declared directly in `devvit.json` under a top-level `scheduler.tasks` map:

  ```json
  "scheduler": {
    "tasks": {
      "daily-nest-tick": { "endpoint": "/internal/scheduler/daily-tick", "cron": "0 0 * * *" }
    }
  }
  ```

  Each task name maps to `{ endpoint, cron?, data? }` (or a bare endpoint string). The declared `endpoint` receives a POST with body `TaskRequest { name, data }` and should return `TaskResponse` (`{}`).

- Dynamic/one-off jobs (e.g. closing a specific naming window at its exact `closesAt` time) are scheduled at runtime from server code via `scheduler.runJob({ name, data, runAt: Date })` or `scheduler.runJob({ name, data, cron })` — `name` must match a task registered in `devvit.json` so the platform knows which endpoint to invoke. `scheduler.cancelJob(jobId)` and `scheduler.listJobs()` are also available.
- This lets naming-window finalization be scheduled precisely (`runAt` = window close time) instead of relying purely on a periodic sweep.

**Realtime** (`realtime` export from `@devvit/web/server`, backed by `@devvit/realtime`):

- Server: `realtime.send<Msg extends JsonValue>(channel: string, msg: Msg): Promise<void>`.
- Client (`@devvit/web/client`): `connectRealtime<Msg>({ channel, onConnect?, onDisconnect?, onMessage }): Connection`, plus `disconnectRealtime(channel)` / `isRealtimeConnected(channel)`.
- No explicit `devvit.json` wiring needed beyond using the APIs — `permissions.realtime` (and `permissions.redis`, `.reddit`, etc.) appear to be inferred by the CLI from actual capability usage at build/upload time rather than hand-declared; confirmed empirically via `devvit playtest` in Phase 6 when realtime is wired up.

**Menu items**: `devvit.json`'s `location` field accepts a single value (`"subreddit"`) or an array — both are valid input; the CLI normalizes to an array internally.

These notes exist so later build phases (5: scheduler tick, 6: realtime, 7: naming finalize) implement against confirmed signatures rather than the hackathon doc's illustrative/older-style samples.
