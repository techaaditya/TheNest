# The Nest

A creature your whole subreddit raises together. Built for Reddit's **Games with a Hook** hackathon on **Devvit Web**.

Every subreddit that installs The Nest gets its own persistent creature. Members spend a few rationed daily actions (feed, pet, play), and the creature's mood and appearance mutate overnight based on the community's *aggregate* behavior. When it mutates, the community names what it becomes by replying to a Reddit comment thread, and the winning name is decided by native Reddit voting with a stability rule so a late vote flip can't steal the win at the last second.

No two subreddits' creatures look or evolve the same way, because no two subreddits care for them the same way.

## How it works

- **Care loop**: each user gets a daily cap of `feed` (3), `pet` (2), and `play` (1) actions per subreddit, enforced server-side. The client never dictates its own limits or identity.
- **Mood and mutation**: care actions nudge a live mood gauge and feed a separate daily accumulator. Once a day, a scheduled server job scores that accumulator; if it clears a threshold (and enough days have passed since the last mutation), the creature mutates deterministically, seeded by subreddit and date, so the same inputs always produce the same result. `GET /api/why` exposes the full breakdown so the mutation is never a black box.
- **Rendering**: the creature is composited live in Phaser from a small, curated, art-directed trait space (base form, tint, pattern overlay, and appendage), layered and tinted rather than swapped between static images.
- **Naming**: a mutation opens a top-level comment thread inviting name suggestions. An hourly job tracks the highest-scoring reply; once it's held the lead through the final hour of the naming window, it wins. Every candidate is filtered through a moderation blocklist before it's eligible, and moderators can force-close a naming thread from the subreddit menu.
- **Realtime**: care actions broadcast live over a per-subreddit channel, so mood and the activity feed update in every open session without a refresh.

## Project layout

```text
src/
  shared/    Data model + tuning config, the single source of truth for both server and client
  server/
    core/    Redis-backed state, rationing, mood/mutation engine, naming, moderation, realtime
    routes/  Hono routes: /api/* (client-facing), /internal/* (menu, forms, triggers, scheduler)
  client/
    creature/  Layered/tinted Phaser creature composition
    scenes/    Boot/NestScene + UI components (mood bars, care buttons, activity, naming, why)
```

## Commands

- `npm run dev`: start a live development server on Reddit (`devvit playtest`)
- `npm run build`: build the client and server
- `npm run type-check`: TypeScript project build
- `npm run lint`: ESLint
- `npm run test`: vitest unit tests (mutation engine determinism, naming finalization logic, moderation filter)
- `npm run deploy`: type-check and lint, then upload a new app version
- `npm run launch`: deploy, then publish for review
- `npm run login`: log the CLI into Reddit

## Architecture notes

Verified against the installed `@devvit/web@0.13.6` / `devvit@0.13.6` packages (source of truth: `node_modules/@devvit/shared-types/schemas/config-file.v1.d.ts`, the exact schema the CLI uses to parse and validate `devvit.json`).

**Scheduler** (`scheduler` export from `@devvit/web/server`, backed by `@devvit/scheduler`):

- Recurring jobs are declared directly in `devvit.json` under a top-level `scheduler.tasks` map:

  ```json
  "scheduler": {
    "tasks": {
      "daily-nest-tick": { "endpoint": "/internal/scheduler/daily-tick", "cron": "0 0 * * *" },
      "naming-finalize-sweep": { "endpoint": "/internal/scheduler/naming-finalize", "cron": "0 * * * *" }
    }
  }
  ```

  Each task name maps to `{ endpoint, cron?, data? }` (or a bare endpoint string). The declared `endpoint` receives a POST with body `TaskRequest { name, data }` and should return `TaskResponse` (`{}`).
- Dynamic/one-off jobs can also be scheduled at runtime via `scheduler.runJob({ name, data, runAt: Date })` or `scheduler.runJob({ name, data, cron })`, where `name` must match a task registered in `devvit.json`. `scheduler.cancelJob(jobId)` and `scheduler.listJobs()` are also available. The Nest currently uses a periodic hourly sweep for naming finalization rather than a precise per-window `runAt` job, since the sweep needs to re-read live comment scores anyway.

**Realtime** (`realtime` export from `@devvit/web/server`, backed by `@devvit/realtime`):

- Server: `realtime.send<Msg extends JsonValue>(channel: string, msg: Msg): Promise<void>`.
- Client (`@devvit/web/client`): `connectRealtime<Msg>({ channel, onConnect?, onDisconnect?, onMessage }): Connection`, plus `disconnectRealtime(channel)` / `isRealtimeConnected(channel)`.
- No explicit `devvit.json` wiring is needed beyond using the APIs. Permissions appear to be inferred by the CLI from actual capability usage at build/upload time, confirmed empirically via `devvit playtest`.
- Channel names may only contain letters, numbers, and underscores; hyphens and colons are rejected at runtime.

**Reddit comment IDs**: `reddit.submitComment`/`getCommentById` require the branded `T1`/`T3` template-literal ID types from `@devvit/shared-types`. Rather than casting plain strings, The Nest uses `assertT1`/`assertT3` type-predicate assertions to narrow them at the point of use (see `src/server/core/naming.ts`).

**Menu items**: `devvit.json`'s `location` field accepts a single value (`"subreddit"`) or an array; both are valid input, and the CLI normalizes to an array internally.

## Credits

Built on the [Devvit](https://developers.reddit.com/) Phaser + Vite + Hono starter template.
