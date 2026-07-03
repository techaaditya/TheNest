import * as Phaser from 'phaser';
import type { Traits } from '../../shared/types';
import {
  APPENDAGE_ACCENT_HEX,
  BASE_GEOMETRY,
  CREATURE_TEXTURE_SIZE,
  TRAIT_COLOR_HEX,
  shadeColor,
} from './traits';

/** Deterministic PRNG (mulberry32) so speckle/stripe placement is stable across reloads and identical for every viewer of the same Nest. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const TEXTURE_ORIGIN = -CREATURE_TEXTURE_SIZE / 2;

/**
 * Composites a creature from layered, tinted Phaser game objects driven by
 * NestState.traits: a base silhouette (generated once per base form, then
 * tinted per color trait), a pattern overlay clipped to that silhouette, an
 * appendage overlay, and a constant pair of eyes so the creature stays
 * recognizable and charming across every trait combination.
 */
export class CreatureRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
  }

  render(traits: Traits): void {
    this.container.removeAll(true);

    const bodyTextureKey = this.ensureBodyTexture(traits.base);
    const colorHex = TRAIT_COLOR_HEX[traits.color];

    const body = this.scene.add.sprite(0, 0, bodyTextureKey);
    body.setTint(colorHex);
    this.container.add(body);

    const pattern = this.buildPatternLayer(traits, colorHex);
    if (pattern) this.container.add(pattern);

    const appendage = this.buildAppendageLayer(traits);
    if (appendage) this.container.add(appendage);

    this.container.add(this.buildFace());
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  private ensureBodyTexture(base: Traits['base']): string {
    const key = `nest-body-${base}`;
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics();
      BASE_GEOMETRY[base].drawSilhouette(g);
      g.generateTexture(key, CREATURE_TEXTURE_SIZE, CREATURE_TEXTURE_SIZE);
      g.destroy();
    }
    return key;
  }

  private buildPatternLayer(
    traits: Traits,
    colorHex: number
  ): Phaser.GameObjects.Graphics | null {
    if (traits.pattern === 'plain') return null;

    const geometry = BASE_GEOMETRY[traits.base];
    const shade = shadeColor(colorHex, 0.65);
    const g = this.scene.add.graphics();
    g.setPosition(TEXTURE_ORIGIN, TEXTURE_ORIGIN);

    if (traits.pattern === 'speckled') {
      const rand = mulberry32(1337);
      let drawn = 0;
      let attempts = 0;
      while (drawn < 14 && attempts < 400) {
        attempts++;
        const x = rand() * CREATURE_TEXTURE_SIZE;
        const y = rand() * CREATURE_TEXTURE_SIZE;
        if (!geometry.isInside(x, y)) continue;
        g.fillStyle(shade, 0.35);
        g.fillCircle(x, y, 4 + rand() * 3);
        drawn++;
      }
    } else if (traits.pattern === 'striped') {
      const stripeSpacing = 18;
      g.fillStyle(shade, 0.3);
      for (let sx = 0; sx < CREATURE_TEXTURE_SIZE * 2; sx += stripeSpacing) {
        for (let y = 0; y < CREATURE_TEXTURE_SIZE; y += 3) {
          const x = sx - y;
          if (x < 0 || x > CREATURE_TEXTURE_SIZE) continue;
          if (!geometry.isInside(x, y)) continue;
          g.fillRect(x, y, 7, 3);
        }
      }
    }

    return g;
  }

  private buildAppendageLayer(
    traits: Traits
  ): Phaser.GameObjects.Graphics | null {
    if (traits.appendage === 'none') return null;

    const g = this.scene.add.graphics();
    const accent = APPENDAGE_ACCENT_HEX[traits.appendage];

    if (traits.appendage === 'small_wings') {
      g.fillStyle(accent, 0.55);
      g.fillEllipse(-78, 10, 34, 54);
      g.fillEllipse(78, 10, 34, 54);
    } else if (traits.appendage === 'horns') {
      g.fillStyle(accent, 1);
      g.fillTriangle(-30, -70, -18, -100, -6, -68);
      g.fillTriangle(30, -70, 18, -100, 6, -68);
    } else if (traits.appendage === 'spots') {
      g.fillStyle(accent, 0.75);
      const spots: [number, number, number][] = [
        [-25, -10, 9],
        [22, 15, 11],
        [-8, 35, 8],
        [30, -25, 7],
      ];
      for (const [dx, dy, r] of spots) {
        g.fillCircle(dx, dy, r);
      }
    }

    return g;
  }

  private buildFace(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(0x1f2937, 1);
    g.fillEllipse(-18, -5, 10, 14);
    g.fillEllipse(18, -5, 10, 14);
    g.lineStyle(3, 0x1f2937, 1);
    g.beginPath();
    g.arc(
      0,
      15,
      14,
      Phaser.Math.DegToRad(20),
      Phaser.Math.DegToRad(160),
      false
    );
    g.strokePath();
    return g;
  }
}
