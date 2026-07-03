# The Nest — A Creature Your Whole Community Raises Together (FINAL)
**Hackathon:** Reddit's Games with a Hook · Built on Devvit Web
**Doc version:** 1.0 FINAL · Build window: Jul 1–15, 2026 · Deadline: Jul 15, 2026 @ 6:00pm PDT

---

## 0. Grounding Corrections (read first)

The original Nest concept didn't specify implementation details, but it's worth stating the correct Devvit Web architecture up front so you don't accidentally build against the older, deprecated-for-this-hackathon Devvit "Blocks" framework:

- **This hackathon requires Devvit Web** — a normal React client (rendered inside the Reddit post via Interactive Posts/webview) talking to a Node.js server that Reddit hosts for you. It is *not* the older Blocks-era framework (`useState`/`useInterval`/`context.ui` custom posts) that a lot of older Devvit tutorials and blog posts still describe — if you find a tutorial using those APIs, it's describing the old framework.
- **State lives in Redis** (`@devvit/redis`), not a generic "KV store" — same idea, current correct package name.
- **Scheduled/timed logic uses `@devvit/scheduler`**, not a client-side timer — critical for The Nest's daily mutation tick, which must fire reliably regardless of whether any specific user has the post open at that moment.
- **Live updates use `@devvit/realtime`** rather than polling — this is what makes the creature feel "alive" (other users' care actions show up without a page refresh) and it's a genuine technical differentiator worth calling out explicitly in your submission.
- **Outbound fetch to any external LLM API is allowlist-gated by Reddit**, not fully open. If The Nest's mood/mutation engine stays action-based only (recommended — see §6), you may not need external fetch at all, which sidesteps this risk entirely. If you add any LLM-generated flavor text as a stretch goal, test fetch access to your chosen provider's domain on Day 1, not Day 10.

---

## 1. Executive Summary

Every subreddit that installs The Nest gets its own persistent creature, shaped entirely by that community's collective care. Members feed, pet, and play with it through rationed daily actions; its mood, color, and mutations shift gradually based on aggregate community activity, giving every subreddit's Nest a genuinely different look and personality over time. Periodically the creature produces an offspring a member can adopt and carry to their own posts or profile — the game's organic spread mechanic.

---

## 2. Why This Wins — Judging Rubric Mapping

| Reddit rubric criterion | The Nest's answer |
|---|---|
| Delightful UX | Layered sprite-based creature rendering (Phaser) gives visible, charming evolution without needing huge art volume |
| Polish | Server-authoritative state (Redis), reliable scheduled ticks (not client-timer-dependent), realtime live updates — built to feel launch-ready, not demo-fragile |
| Reddit-y | The creature is a literal emergent expression of *that specific community's* behavior — not generic, not about Reddit itself, genuinely community-shaped |
| Hook-y | Daily rationed care (Wordle-style return pull) + gradual, visible evolution (Tamagotchi-style long-term stake) — two different, compounding retention mechanisms |
| Best Use of Phaser (sub-challenge) | Layered/tinted sprite composition for mutations is a clean, genuine showcase of Phaser's rendering strengths, not just a static image swap |
| Best Use of User Contributions (sub-challenge) | Naming/voting on mutations, and offspring adoption spreading across subreddits, are both structurally central UGC mechanics, not bolted on |

**Explicitly avoiding the hackathon's "don't build this" list:** not a space shooter/clone/platformer/trivia/collaborative-storytelling app (see the other doc for that genre); not literally about Reddit/karma/Snoo; not a literal-hook game.

---

## 3. Users & Personas

- **Casual daily carer**: opens the post, spends their few daily actions, leaves — the core, high-frequency loop.
- **Community "curator"**: top contributors who propose/vote on mutation names, functionally community stewards of the creature's identity.
- **Adopter**: takes an offspring to their own post/profile — the cross-subreddit spread vector.
- **Moderator**: can moderate proposed names (profanity/abuse filtering — see §11) and, if needed, reset or pause a Nest.

---

## 4. Scope

### MVP
1. One persistent creature per subreddit install, Phaser-rendered with a base form + swappable/tintable mutation layers.
2. Rationed daily care actions (feed/pet/play) per user per subreddit, server-authoritative.
3. Aggregate action-based mood engine driving a daily mutation/growth tick (scheduled, not client-timer-dependent).
4. Naming/voting on the creature and on named mutations, via native Reddit comments/polls where possible.
5. Live realtime updates so care actions from other users appear without a refresh.
6. A visible "recent activity" panel so a short first visit still shows something dynamic (see §12 pitfall).

### Stretch
- Offspring adoption to a personal post/profile.
- Cross-subreddit "playdate" events.
- LLM-generated flavor text/biography entries for named mutations (only if your fetch-allowlist test in §0 succeeds early).

### Explicitly Out of Scope
- LLM-based sentiment analysis of comment text as the mood driver for MVP — action-based signals (feed/pet/play frequency and diversity) are faster to build, easier to make robust, and avoid any "AI slop" feel since the creature's behavior visibly comes from real community actions, not an AI's interpretation of them. Promote this to a stretch goal only if MVP is solid early.

---

## 5. Feature Spec — Written Out in Full

### 5.1 The Creature (Phaser rendering)
A base sprite with layered, swappable/tintable "mutation slots": color palette, texture/pattern, 1-2 appendage slots (horns, wings, spots, etc.). Design a small, well-art-directed trait space up front (sketch it before writing code) rather than combinatorially random traits — a `few well-designed options per slot, composited together` reads as charming; fully random trait rolls read as glitchy and undercuts "Delightful UX" and the "avoid AI slop" requirement.

### 5.2 Care Actions
Each user gets N actions per day per subreddit (e.g., 3 feed + 2 pet + 1 play), server-tracked, resetting at a fixed UTC time. Each action type nudges a different mood axis (feed → contentment, pet → affection, play → energy) — three simple accumulating counters, not a complex simulation.

### 5.3 Mood & Mutation Engine (server-side, deterministic)
```
daily_mood_score = weighted_sum(contentment_delta, affection_delta, energy_delta,
                                  action_diversity_bonus)   # diversity bonus rewards
                                                              # communities that do all
                                                              # three action types, not
                                                              # just spam one
mutation_roll = deterministic_function(daily_mood_score, days_since_last_mutation, seed)
```
Keep this readable and inspectable — a "why did it mutate that way" panel (even a simple one) is good "Polish" and "Delightful UX" evidence, and it protects you from the "random/glitchy" failure mode named in §5.1.

### 5.4 Naming & Lore
When a new mutation appears, open a naming window (e.g., 24 hours) where users submit name suggestions as comments and the top-voted (with the same stability caveat as the sister doc's vote mechanic — see §9) becomes canonical, added to the creature's visible "biography."

### 5.5 Offspring Adoption (stretch)
At mutation/growth milestones, the creature can produce an offspring; the community (or a random/merit-based selection — decide up front) picks one member to adopt it, rendering a smaller personal version linkable to their own posts.

---

## 6. System Architecture

```
Reddit Post (Devvit Web — React client in webview)
        │
        ▼
┌─────────────────────┐        ┌──────────────────────┐
│  Nest Client (React +  │ <----> │  Nest Server (Node.js)  │
│  Phaser canvas)         │  HTTP  │  @devvit/web/server      │
└─────────────────────┘        └──────────┬───────────┘
                                            │
                       ┌────────────────────┼────────────────────┐
                       ▼                    ▼                    ▼
              ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
              │  Redis (state)   │   │  Scheduler        │   │  Realtime          │
              │  care counts,     │   │  daily mutation    │   │  broadcast care     │
              │  mood accumulators,│  │  tick (@devvit/     │   │  actions to all      │
              │  mutation history  │  │  scheduler)         │   │  connected clients   │
              └────────────────┘   └────────────────┘   └────────────────┘
```

---

## 7. Data Model

### `NestState` (per subreddit)
```json
{
  "subreddit_id": "t5_abc123",
  "creature_id": "NEST-001",
  "traits": { "base": "sprout", "color": "teal", "pattern": "speckled", "appendage": "none" },
  "mood": { "contentment": 62, "affection": 48, "energy": 71 },
  "mutation_history": [
    { "date": "2026-07-03", "trait_changed": "appendage", "new_value": "small_wings",
      "name": "Skybuds", "named_by_vote": true }
  ],
  "last_tick_at": "2026-07-04T00:00:00Z"
}
```

### `DailyActionLog` (per user, per subreddit, per day — for rationing)
```json
{ "user_id": "u_123", "subreddit_id": "t5_abc123", "date": "2026-07-04",
  "feed_used": 2, "feed_cap": 3, "pet_used": 1, "pet_cap": 2, "play_used": 0, "play_cap": 1 }
```

### `NameProposal`
```json
{ "proposal_id": "NP-01", "mutation_id": "M-04", "text": "Skybuds",
  "submitted_by": "u_456", "votes": 14, "status": "pending | canonical | rejected" }
```

---

## 8. Starter Code

### 8.1 Server: rationed care action endpoint
```typescript
import { redis } from '@devvit/web/server';

app.post('/api/care-action', async (req, res) => {
  const { userId, subredditId, actionType } = req.body; // actionType: feed|pet|play
  const dateKey = `actions:${subredditId}:${userId}:${todayUTC()}`;
  const log = await redis.hGetAll(dateKey) ?? {};
  const used = parseInt(log[`${actionType}_used`] ?? '0');
  const cap = ACTION_CAPS[actionType]; // server-defined, never trust a client-sent cap

  if (used >= cap) {
    return res.status(429).json({ error: 'daily_cap_reached' });
  }

  await redis.hIncrBy(dateKey, `${actionType}_used`, 1);
  await redis.expire(dateKey, 60 * 60 * 26); // slightly over 24h, safe cleanup buffer
  await updateMoodAccumulator(subredditId, actionType);
  await broadcastCareAction(subredditId, userId, actionType); // @devvit/realtime

  res.json({ ok: true, remaining: cap - used - 1 });
});
```

### 8.2 Scheduled daily mutation tick
```typescript
import { scheduler } from '@devvit/scheduler';

scheduler.runJob({
  name: 'daily-nest-tick',
  cron: '0 0 * * *',  // midnight UTC — verify current scheduler cron syntax/limits at build time
  onRun: async (event, context) => {
    const subreddits = await getAllInstalledSubreddits();
    for (const subredditId of subreddits) {
      const state = await getNestState(subredditId);
      const mood = await getAccumulatedMood(subredditId);
      const mutation = computeMutationRoll(mood, state); // deterministic function, §5.3
      if (mutation) {
        await applyMutation(subredditId, mutation);
        await openNamingWindow(subredditId, mutation);
      }
      await resetMoodAccumulators(subredditId);
    }
  },
});
```

---

## 9. Vote-Counting Caveat (shared with the sister doc — read this)

Reddit's API-reported vote scores are intentionally fuzzed and delayed for anti-manipulation reasons — the exact number you fetch via the API is not guaranteed to be the precise, instantaneous "true" count. For The Nest's naming votes, this matters less than it does for the sister doc's every-5-minutes story mechanic (naming windows run 24 hours, so fuzzing noise washes out), but still: require the leading name to hold the top spot for at least the final hour of the naming window before finalizing, rather than snapshotting at the exact close instant.

---

## 10. Tech Stack

Devvit Web (React + TypeScript client, Node.js server) · Phaser (creature rendering) · `@devvit/redis` (state) · `@devvit/scheduler` (daily tick) · `@devvit/realtime` (live care-action broadcast) · Reddit API via `@devvit/web/server` (comments for naming votes, user flair if you want a lightweight "adopted offspring" badge).

---

## 11. Moderation & Safety

- **Name proposals need a profanity/abuse filter before anything becomes canonical** — this is genuinely important since a canonical name is permanently visible community-wide; run proposed names through a basic blocklist/filter, and give moderators a one-click reject even after a name wins a vote, before it's ever confirmed permanent.
- **Server-authoritative action counts** (§8.1) are both a fairness requirement and an anti-cheat requirement — never trust a client-reported action count or cap.
- **Rate-limit the naming-window open events** so a bad actor can't spam mutation triggers to flood the naming queue.

---

## 12. Day-by-Day Build Plan (14 days, Jul 1–15)

| Days | Work |
|---|---|
| Jul 1–2 | Devvit Web scaffold from the Phaser template; Redis setup; create your test subreddit |
| Jul 3–4 | Base creature render + layered/tintable mutation system in Phaser; design the trait space on paper first |
| Jul 5–6 | Rationed care actions (§8.1) + mood accumulators |
| Jul 7 | Scheduled daily mutation tick (§8.2) |
| Jul 8 | Realtime broadcast of care actions across connected clients |
| Jul 9 | Naming/voting flow + moderation filter (§11) |
| Jul 10–11 | **Post the live demo on your subreddit** and seed real activity so the creature has genuine history and something visibly dynamic to show on a short visit (see §14 pitfall) |
| Jul 12 | Offspring adoption (stretch, if on schedule) |
| Jul 13 | Polish: mobile viewport, first-visit onboarding clarity, "why did it mutate" panel |
| Jul 14 | App listing, submission text, feedback survey |
| Jul 15 | Submit with buffer |

---

## 13. Testing & Validation Plan

- Server-side cap enforcement: attempt to exceed the daily action cap via direct API calls (not just through the UI) and confirm it's rejected.
- Scheduled tick reliability: manually trigger the scheduled job path and confirm it runs correctly with zero connected clients (simulating "nobody's watching at midnight UTC").
- Realtime broadcast: two browser sessions, confirm a care action in one appears in the other without a refresh.
- Naming filter: run a deliberately adversarial set of proposed names (profanity, impersonation attempts, off-topic spam) through the filter before trusting it live.

---

## 14. Common Pitfalls (do not skip)

- If a judge's first visit is short, the creature needs *something* visibly dynamic to show immediately (a recent-activity feed, a visible mood state, recent mutation history) — don't design a game that only rewards multi-day return visits with nothing to show a first-time, short visit.
- Random-looking mutations without real art direction read as "AI slop" instantly — the trait space design in §5.1 is not optional polish, it's core to passing the hackathon's explicit anti-slop bar.
- Client-trusted action counts are both a cheat vector and, once discovered, a credibility problem with judges who interact with your live post.

---

## 15. Demo Video / Live-Post Framing

Since Reddit's judging is primarily based on interacting with your live demo post, treat your written submission text and the post itself (not a separate scripted video beat-sheet) as your primary presentation surface — but if you do also record a walkthrough:

> "Every subreddit that installs The Nest gets its own creature — and it's not scripted, it's *shaped* by how that specific community treats it. Watch: I feed it, a teammate pets it, someone else plays with it — and the mood you're seeing update live is the aggregate of all of that, with zero refresh needed." *(show realtime update across two sessions)* "Overnight, if the community's been active and varied in how they cared for it, it mutates — and the community names what it becomes." *(show a past mutation + its community-voted name)*

---

## 16. Judging Rubric Self-Audit

| Criterion | Self-check |
|---|---|
| Delightful UX | Is there something visibly dynamic on a short, first-time visit? |
| Polish | Server-authoritative state? Reliable scheduled tick, not client-timer-dependent? Mobile-tested? |
| Reddit-y | Does the creature visibly differ subreddit-to-subreddit based on real community behavior, not a fixed script? |
| Hook-y | Rationed daily return pull + visible long-term evolution, both present and both demoable? |
| Best Use of Phaser | Layered/tinted composition genuinely showcased, not a static image swap? |

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mutation trait space looks random/glitchy without enough art direction | Medium | High (hits "AI slop" bar directly) | Design trait space on paper before coding (§5.1); keep the set small and well-composited |
| No visible activity for a judge's short first visit | Medium | High | Build the "recent activity" panel explicitly (§14); seed real activity before judging |
| Scheduled tick fails silently if nobody's watching | Low-Medium | Medium | Test the tick path with zero connected clients (§13) |
| Naming vote result includes an inappropriate name | Low (with filter) | High | Filter + mod override before anything is canonical (§11) |

---

## 18. Final Submission Checklist

- [ ] App listing link on developer.reddit.com
- [ ] Live, public demo post on your subreddit, self-explanatory with zero external instructions
- [ ] Mobile viewport tested
- [ ] No AI-slop tells — distinct visual identity, fits viewport, feels human-designed
- [ ] Retention loop (rationed actions + evolving state) visibly working before judging, not just in theory
- [ ] Moderation filter on name proposals functioning
- [ ] (Optional) developer satisfaction survey completed

## 19. Resources

- Hackathon: https://redditgameswithahook.devpost.com/ · Rules: https://redditgameswithahook.devpost.com/rules
- Devvit Web overview: https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview
- Template Library (Phaser template): https://developers.reddit.com/docs/examples/template-library
- `@devvit/web`, `@devvit/redis`, `@devvit/scheduler`, `@devvit/realtime` packages: https://www.npmjs.com/package/@devvit/web (and sibling packages)
- Devvit Rules: https://developers.reddit.com/docs/devvit_rules
