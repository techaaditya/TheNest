// Shared data model and API contracts between the server and the Phaser/React client.
// Keep this file isomorphic: no imports from @devvit/web or any server/client-only package.

export type BaseForm = 'sprout' | 'pip';
export type ColorTrait = 'teal' | 'coral' | 'amber' | 'violet';
export type PatternTrait = 'plain' | 'speckled' | 'striped';
export type AppendageTrait = 'none' | 'small_wings' | 'horns' | 'spots';

export type TraitSlot = 'base' | 'color' | 'pattern' | 'appendage';

export type Traits = {
  base: BaseForm;
  color: ColorTrait;
  pattern: PatternTrait;
  appendage: AppendageTrait;
};

export type MoodAxis = 'contentment' | 'affection' | 'energy';

/** Persistent mood baseline, 0-100 per axis. */
export type Mood = Record<MoodAxis, number>;

export type CareActionType = 'feed' | 'pet' | 'play';

export type MutationRecord = {
  mutationId: string;
  /** yyyy-mm-dd, UTC */
  date: string;
  traitChanged: TraitSlot;
  previousValue: string;
  newValue: string;
  /** null while the naming window is still open */
  name: string | null;
  namedByVote: boolean;
};

export type NestState = {
  subredditId: string;
  creatureId: string;
  /** The Reddit post this Nest lives on — naming threads are comments on it. Empty until the install trigger sets it. */
  postId: string;
  traits: Traits;
  mood: Mood;
  mutationHistory: MutationRecord[];
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp, null before the first daily tick */
  lastTickAt: string | null;
};

export type DailyActionCounts = Record<CareActionType, number>;

export type DailyActionLog = {
  userId: string;
  subredditId: string;
  /** yyyy-mm-dd, UTC */
  date: string;
  used: DailyActionCounts;
  caps: DailyActionCounts;
};

export type ActivityItem = {
  userDisplay: string;
  actionType: CareActionType;
  /** epoch ms */
  ts: number;
};

export type NamingWindowStatus = 'open' | 'finalizing' | 'closed';

export type NamingWindow = {
  mutationId: string;
  subredditId: string;
  /** Reddit comment/post id hosting the naming thread */
  threadId: string;
  /** ISO timestamp */
  opensAt: string;
  /** ISO timestamp */
  closesAt: string;
  leaderCommentId: string | null;
  /** epoch ms - when the current leader first took the lead */
  leaderSinceTs: number | null;
  status: NamingWindowStatus;
};

// ---- API DTOs (client <-> server) ----

export type InitResponse = {
  type: 'init';
  nest: NestState;
  remaining: DailyActionCounts;
  activity: ActivityItem[];
};

export type CareActionRequest = {
  actionType: CareActionType;
};

export type CareActionResponse = {
  type: 'care-action';
  ok: true;
  remaining: number;
};

export type CareActionErrorResponse = {
  error: 'daily_cap_reached';
};

export type StateResponse = {
  type: 'state';
  nest: NestState;
};

export type ActivityResponse = {
  type: 'activity';
  activity: ActivityItem[];
};

export type WhyMutationInput = {
  contentmentDelta: number;
  affectionDelta: number;
  energyDelta: number;
  diversityBonus: number;
  dailyMoodScore: number;
  daysSinceLastMutation: number;
  threshold: number;
  mutated: boolean;
};

export type WhyResponse = {
  type: 'why';
  lastTickAt: string | null;
  input: WhyMutationInput | null;
  appliedMutation: MutationRecord | null;
};

export type NamingStatusResponse = {
  type: 'naming';
  latestMutation: MutationRecord | null;
  /** Present only while a naming window is open/finalizing for the latest mutation. */
  window: NamingWindow | null;
};

export type RealtimeCareMessage = {
  actionType: CareActionType;
  userDisplay: string;
  ts: number;
  mood: Mood;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
