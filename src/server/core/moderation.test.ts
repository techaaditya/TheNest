import { describe, expect, it } from 'vitest';
import { isNameAllowed, normalizeName } from './moderation';

describe('normalizeName', () => {
  it('trims whitespace and collapses internal runs', () => {
    expect(normalizeName('  Sir   Sprouts-a-lot  ')).toBe('Sir Sprouts-a-lot');
  });

  it('only takes the first line of a multi-line comment', () => {
    expect(normalizeName('Sprout\nI also think we should feed it more')).toBe(
      'Sprout'
    );
  });

  it('strips emoji and punctuation noise, keeping letters, numbers, spaces, hyphens, apostrophes', () => {
    expect(normalizeName('🌱 Sprout!!! #1 🎉')).toBe('Sprout 1');
  });

  it('caps length at 24 characters', () => {
    const long = 'A'.repeat(40);
    expect(normalizeName(long)).toHaveLength(24);
  });

  it('returns an empty string for input with nothing usable', () => {
    expect(normalizeName('🎉🎉🎉')).toBe('');
  });
});

describe('isNameAllowed', () => {
  it('rejects names shorter than the minimum length', () => {
    expect(isNameAllowed('A')).toBe(false);
    expect(isNameAllowed('')).toBe(false);
  });

  it('accepts a normal, wholesome name', () => {
    expect(isNameAllowed('Sir Sprouts-a-lot')).toBe(true);
  });

  it('rejects names containing blocklisted words, case-insensitively', () => {
    expect(isNameAllowed('FuckFace')).toBe(false);
    expect(isNameAllowed('shitface')).toBe(false);
  });
});
