// Normalizes and filters community-submitted mutation names before they can
// ever become canonical. Kept deliberately simple and pure so it's unit
// testable without touching Redis or the Reddit API.

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 24;

/** Lowercase substrings that disqualify a name outright. Not exhaustive —
 * a defensible, functional baseline for a hackathon submission, not a
 * production-grade profanity filter. */
const BLOCKLIST: readonly string[] = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'whore',
  'slut',
  'rape',
  'nazi',
  'hitler',
];

/** Trims to the first line, strips punctuation/emoji noise, collapses
 * whitespace, and caps length. Returns '' if nothing usable remains. */
export const normalizeName = (raw: string): string =>
  raw
    .split('\n')[0]
    ?.trim()
    .replace(/[^\p{L}\p{N} '-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim() ?? '';

export const isNameAllowed = (normalized: string): boolean => {
  if (normalized.length < MIN_NAME_LENGTH) return false;
  const lower = normalized.toLowerCase();
  return !BLOCKLIST.some((word) => lower.includes(word));
};
