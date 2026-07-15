import * as Phaser from 'phaser';
import type { WhyResponse } from '../../../shared/types';
import { addCardChrome } from './card';

const NO_TICK_MESSAGE =
  "The Nest hasn't had its first\novernight check yet.";

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 168;

export class WhyPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    addCardChrome(
      scene,
      this.container,
      CARD_WIDTH,
      CARD_HEIGHT,
      '🧬 Overnight mutation check',
      '#2f8d82'
    );

    this.text = scene.add.text(
      -CARD_WIDTH / 2 + 14,
      -CARD_HEIGHT / 2 + 38,
      NO_TICK_MESSAGE,
      {
        fontFamily: 'Arial',
        fontSize: 13,
        color: '#5c5138',
        align: 'left',
        lineSpacing: 8,
        wordWrap: { width: CARD_WIDTH - 28 },
      }
    );
    this.container.add(this.text);
  }

  setWhy(why: WhyResponse): void {
    if (!why.input) {
      this.text.setText(NO_TICK_MESSAGE);
      return;
    }

    const { input, appliedMutation } = why;
    const diversitySuffix =
      input.diversityBonus > 0
        ? ` · diversity bonus +${input.diversityBonus}`
        : '';

    const lines = [
      `Mood score ${input.dailyMoodScore.toFixed(0)} of ${input.threshold} needed`,
      `contentment +${input.contentmentDelta} · affection +${input.affectionDelta} · energy +${input.energyDelta}${diversitySuffix}`,
      input.mutated && appliedMutation
        ? `Mutated! ${appliedMutation.traitChanged} → ${appliedMutation.newValue}`
        : `No mutation (days since last: ${input.daysSinceLastMutation})`,
    ];
    this.text.setText(lines.join('\n'));
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
