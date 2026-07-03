// Visual mapping for the curated trait space defined in shared/config.ts.
// shared/config.ts owns *which* trait values are valid; this file owns *how*
// each value is drawn (geometry, hex colors) — client-only, Phaser-facing.

import type * as Phaser from 'phaser';
import type { AppendageTrait, BaseForm, ColorTrait } from '../../shared/types';

/** Hex fill colors for each color trait, used with Sprite.setTint(). */
export const TRAIT_COLOR_HEX: Record<ColorTrait, number> = {
  teal: 0x2dd4bf,
  coral: 0xff8a65,
  amber: 0xffb84d,
  violet: 0xa78bfa,
};

/** Darkens a 0xRRGGBB color by `factor` (0-1, lower = darker). Used to derive pattern/appendage shading from the body color instead of hand-picking a second palette. */
export const shadeColor = (hex: number, factor: number): number => {
  const r = Math.round(((hex >> 16) & 0xff) * factor);
  const g = Math.round(((hex >> 8) & 0xff) * factor);
  const b = Math.round((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
};

/** Square canvas size every generated creature layer is drawn into. */
export const CREATURE_TEXTURE_SIZE = 200;

const CENTER = CREATURE_TEXTURE_SIZE / 2;

const ellipseInside = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): boolean => (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1;

export type BaseGeometry = {
  /** Point-in-body test, used to keep pattern speckles/stripes inside the silhouette. */
  isInside: (x: number, y: number) => boolean;
  /** Draws the neutral white silhouette a tintable body texture is generated from. */
  drawSilhouette: (g: Phaser.GameObjects.Graphics) => void;
};

/**
 * The curated base-form geometry. Every shape here is deliberately designed —
 * mutations only ever pick from shared/config.ts's TRAIT_SPACE, never a free
 * random roll (doc §5.1, the anti-"AI slop" bar).
 */
export const BASE_GEOMETRY: Record<BaseForm, BaseGeometry> = {
  sprout: {
    isInside: (x, y) => ellipseInside(x, y, CENTER, CENTER + 15, 62, 72),
    drawSilhouette: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(CENTER, CENTER + 15, 124, 144);
      g.fillTriangle(
        CENTER - 4,
        CENTER - 55,
        CENTER - 34,
        CENTER - 15,
        CENTER + 4,
        CENTER - 25
      );
      g.fillTriangle(
        CENTER + 4,
        CENTER - 55,
        CENTER + 34,
        CENTER - 15,
        CENTER - 4,
        CENTER - 25
      );
    },
  },
  pip: {
    isInside: (x, y) => ellipseInside(x, y, CENTER, CENTER, 68, 68),
    drawSilhouette: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(CENTER, CENTER, 68);
      g.fillEllipse(CENTER - 30, CENTER + 62, 26, 16);
      g.fillEllipse(CENTER + 30, CENTER + 62, 26, 16);
    },
  },
};

/** Fixed appendage accent color, independent of body color so appendages always read clearly against any of the four body colors. */
export const APPENDAGE_ACCENT_HEX: Record<
  Exclude<AppendageTrait, 'none'>,
  number
> = {
  small_wings: 0xffffff,
  horns: 0x3f2d1c,
  spots: 0xffffff,
};
