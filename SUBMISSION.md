# The Nest — Submission Notes

Working notes for the Devpost submission (`redditgameswithahook.devpost.com`). Fill in the bracketed links once the app is deployed and a live demo post exists — see "Manual steps before submitting" below.

## Submission write-up (paste into Devpost)

**Title:** The Nest

**Tagline:** A creature your whole subreddit raises together — its mood and mutations are shaped entirely by real community behavior, not a script.

**Description:**

Every subreddit that installs The Nest gets its own persistent creature. Members spend a few rationed daily actions — feed, pet, play — and overnight the creature's mood and appearance mutate based on the *aggregate* of how the community treated it that day. Mutations are deterministic and inspectable (there's a "why did it mutate" panel breaking down the score), never a random glitch. When it mutates, the community names what it becomes by replying to a native Reddit comment thread; the winning name is the highest-voted reply, but it has to hold the lead through the final hour of the naming window before it's locked in, so Reddit's fuzzed/delayed vote scores can't flip the outcome right at the wire.

No two subreddits' creatures look or evolve the same way, because no two subreddits care for them the same way.

**What makes it Reddit-y:** the creature is a literal emergent expression of one specific community's real behavior — not generic, not about Reddit itself. Its evolution and its name both come from that subreddit's own members, through native Reddit voting.

**What makes it hook-y:** two compounding retention mechanisms — a daily rationed return pull (Wordle-style) and a slow, visible, permanent evolution (Tamagotchi-style long-term stake). Miss a day and nothing resets, but the community's collective pace of change slows.

**Best Use of Phaser:** the creature isn't a static image swap between mutation states — it's composited live from layered, tinted Phaser game objects (base silhouette + tint + pattern overlay + appendage), from a small, curated, art-directed trait space designed to avoid an "AI slop" feel.

**Best Use of User Contributions:** naming a mutation is structurally load-bearing, not bolted on — it happens entirely through native Reddit comments and votes, with a moderation filter and a final-hour stability rule before anything becomes canonical.

**Live demo post:** `[fill in after deploying — see below]`
**App listing:** `[fill in after deploying — see below]`

## Manual steps before submitting

These require your own Reddit login/session, so I can't run them for you:

1. `npm run login` (if not already logged in via `devvit login`).
2. `npm run deploy` — type-checks, lints, and uploads a new app version.
3. `npm run launch` (or `devvit publish` once you're happy with `deploy`) to submit the app version for review, and/or install it directly on a test subreddit you moderate via the Devvit developer portal.
4. On your subreddit, use the moderator menu action **"Create a new post"** to spawn the live demo post.
5. **Seed real, varied activity before judging** (doc §14 — a short first visit needs to already look alive): have a few different accounts feed/pet/play a handful of times across a day or two so the activity panel and mood bars aren't empty on first view. If you want a mutation visible in the demo, you may temporarily lower `MUTATION_SCORE_THRESHOLD` in `src/shared/config.ts`, trigger one, then restore it before final submission.
6. Copy the live post's URL and the app's `developer.reddit.com` listing URL into the blanks above.
7. Optionally complete the Devvit developer satisfaction survey (doc §18, optional).

## Judging rubric self-audit

| Criterion | Status | Notes |
|---|---|---|
| Delightful UX | ✅ | Activity feed, mood bars, and the naming/why panels all show something dynamic on a short first visit — once real activity is seeded (step 5 above). |
| Polish | ✅ | All state is server-authoritative (Redis); the daily tick and naming sweep are both scheduled server jobs, not client timers; mobile scale floor + tap targets addressed in Phase 8a. |
| Reddit-y | ✅ | Mutation naming happens via real Reddit comments/votes; the creature's traits are driven entirely by that subreddit's own recorded care actions. |
| Hook-y | ✅ | Rationed daily caps (`feed:3 pet:2 play:1`) + a deterministic, inspectable overnight mutation engine are both implemented and demoable. |
| Best Use of Phaser | ✅ | `CreatureRenderer` composites layered, tinted Phaser game objects from a curated trait space, plus a tween/particle mutation transition — not a static image swap. |

## Final checklist (doc §18)

- [ ] App listing link on developer.reddit.com — *pending deploy*
- [ ] Live, public demo post on your subreddit, self-explanatory with zero external instructions — *pending deploy; splash screen and onboarding banner now carry the necessary context*
- [x] Mobile viewport tested — scale floor + larger tap targets added in Phase 8a; **please confirm on an actual device before submitting**
- [x] No AI-slop tells — curated trait space, finished splash screen (no boilerplate template text remains), distinct visual identity
- [ ] Retention loop (rationed actions + evolving state) visibly working before judging, not just in theory — *needs seeded activity, step 5 above*
- [x] Moderation filter on name proposals functioning — blocklist + final-hour hold rule, unit-tested
- [ ] (Optional) developer satisfaction survey completed
