import * as Phaser from 'phaser';
import type { CareActionType, Traits } from '../../shared/types';
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
 * appendage overlay, and a constant face so the creature stays recognizable
 * and charming across every trait combination.
 *
 * Container nesting keeps animation channels independent so they never fight
 * over the same property:
 *   outer   — layout position/scale (owned by the scene's updateLayout)
 *   reactor — care reactions & mutation punches (y / angle / scale bursts)
 *   breather— continuous idle breathing (gentle scale yoyo)
 */
export class CreatureRenderer {
  private scene: Phaser.Scene;
  private outer: Phaser.GameObjects.Container;
  private reactor: Phaser.GameObjects.Container;
  private breather: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.outer = scene.add.container(x, y);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x4a3b1d, 0.22);
    shadow.fillEllipse(0, 96, 122, 22);
    this.outer.add(shadow);

    this.reactor = scene.add.container(0, 0);
    this.outer.add(this.reactor);

    this.breather = scene.add.container(0, 0);
    this.reactor.add(this.breather);

    scene.tweens.add({
      targets: this.breather,
      scaleY: 1.035,
      scaleX: 0.985,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.scheduleBlink();
  }

  render(traits: Traits): void {
    this.breather.removeAll(true);
    this.eyes = null;

    const bodyTextureKey = this.ensureBodyTexture(traits.base);
    const colorHex = TRAIT_COLOR_HEX[traits.color];

    const body = this.scene.add.sprite(0, 0, bodyTextureKey);
    body.setTint(colorHex);
    this.breather.add(body);

    const pattern = this.buildPatternLayer(traits, colorHex);
    if (pattern) this.breather.add(pattern);

    const appendage = this.buildAppendageLayer(traits);
    if (appendage) this.breather.add(appendage);

    const cheeks = this.buildCheeks(colorHex);
    this.breather.add(cheeks);

    this.eyes = this.buildEyes();
    this.breather.add(this.eyes);
    this.breather.add(this.buildMouth());
  }

  setPosition(x: number, y: number): void {
    this.outer.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.outer.setScale(scale);
  }

  /** The creature visibly responds to being cared for — a different little
   * motion per action so feeding, petting, and playing each feel distinct. */
  playCareReaction(actionType: CareActionType): void {
    this.scene.tweens.killTweensOf(this.reactor);
    this.reactor.setPosition(0, 0);
    this.reactor.setAngle(0);
    this.reactor.setScale(1);

    if (actionType === 'feed') {
      // A satisfied chomp: squash down, then spring back.
      this.scene.tweens.add({
        targets: this.reactor,
        scaleY: 0.86,
        scaleX: 1.1,
        duration: 130,
        yoyo: true,
        ease: 'Quad.Out',
      });
    } else if (actionType === 'pet') {
      // A happy lean into the hand.
      this.scene.tweens.add({
        targets: this.reactor,
        angle: 7,
        duration: 160,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.InOut',
      });
    } else {
      // An excited hop.
      this.scene.tweens.add({
        targets: this.reactor,
        y: -30,
        duration: 190,
        yoyo: true,
        ease: 'Quad.Out',
      });
    }
  }

  /** A brief scale-punch plus an outward puff of particles, played whenever
   * the daily tick has produced a new mutation — the visible payoff for the
   * community's care (doc §5.1 / §14). */
  playMutationTransition(): void {
    this.reactor.setScale(1.3);
    this.scene.tweens.add({
      targets: this.reactor,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.Out',
    });

    const puffCount = 10;
    for (let i = 0; i < puffCount; i++) {
      const angle = (i / puffCount) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const puff = this.scene.add.graphics();
      puff.fillStyle(0xfbbf24, 0.9);
      puff.fillCircle(0, 0, 6);
      puff.setPosition(this.outer.x, this.outer.y);

      this.scene.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(angle) * distance,
        y: puff.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.Out',
        onComplete: () => puff.destroy(),
      });
    }
  }

  private scheduleBlink(): void {
    this.scene.time.addEvent({
      delay: 2200 + Math.random() * 2800,
      callback: () => {
        if (this.eyes) {
          this.scene.tweens.add({
            targets: this.eyes,
            scaleY: 0.12,
            duration: 70,
            yoyo: true,
            ease: 'Sine.InOut',
          });
        }
        this.scheduleBlink();
      },
    });
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

  private buildCheeks(colorHex: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(shadeColor(colorHex, 0.8), 0.5);
    g.fillEllipse(-34, 12, 16, 10);
    g.fillEllipse(34, 12, 16, 10);
    return g;
  }

  /** Eyes live in their own graphics, positioned on the eye-line, so the
   * blink tween's scaleY collapses them in place instead of around the body
   * center. */
  private buildEyes(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.setPosition(0, -5);
    g.fillStyle(0x1f2937, 1);
    g.fillEllipse(-18, 0, 10, 14);
    g.fillEllipse(18, 0, 10, 14);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(-16, -3, 2);
    g.fillCircle(20, -3, 2);
    return g;
  }

  private buildMouth(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
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
