// The Nest's hand-picked color palette: warm sand and cream skies over a
// teal-to-steel ground. Single source of truth for every UI color so the
// whole scene stays coherent.

export const PALETTE = {
  sand: 0xe6cd92,
  cream: 0xfcf2c6,
  teal: 0x35ab9f,
  tealDark: 0x2e968b,
  steel: 0x47828e,
  steelDark: 0x386874,
} as const;

/** CSS-string colors for Phaser text styles. */
export const TEXT = {
  /** Dark steel: primary headings. */
  ink: '#2e5560',
  /** Steel: secondary headings/subtitles. */
  steel: '#47828e',
  /** Warm brown: body copy on cream cards. */
  body: '#5c5138',
  /** Muted warm brown: timestamps, counts, hints. */
  muted: '#8a7a4f',
  /** Cream: text on teal/steel fills. */
  cream: '#fcf2c6',
  /** Dark amber: warnings/status lines on sand. */
  amber: '#8a5a1f',
} as const;
