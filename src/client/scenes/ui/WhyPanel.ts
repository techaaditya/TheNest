import * as Phaser from 'phaser';
import type { WhyResponse } from '../../../shared/types';

const NO_TICK_MESSAGE = "The Nest hasn't had its first daily tick yet.";

export class WhyPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.text = scene.add.text(0, 0, NO_TICK_MESSAGE, {
      fontFamily: 'Arial',
      fontSize: 13,
      color: '#64748b',
      align: 'left',
      lineSpacing: 4,
    });
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
      `Last tick: mood score ${input.dailyMoodScore.toFixed(0)} / needs ${input.threshold}`,
      `contentment +${input.contentmentDelta} · affection +${input.affectionDelta} · energy +${input.energyDelta}${diversitySuffix}`,
      input.mutated && appliedMutation
        ? `Mutated: ${appliedMutation.traitChanged} -> ${appliedMutation.newValue}`
        : `No mutation this tick (days since last: ${input.daysSinceLastMutation})`,
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
