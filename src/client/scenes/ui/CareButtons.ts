import * as Phaser from 'phaser';
import type { CareActionType, DailyActionCounts } from '../../../shared/types';

export type CareButtonsCallbacks = {
  onAction: (actionType: CareActionType) => void;
};

const ACTION_TYPES: CareActionType[] = ['feed', 'pet', 'play'];

const LABELS: Record<CareActionType, string> = {
  feed: 'Feed',
  pet: 'Pet',
  play: 'Play',
};

const BUTTON_SPACING = 170;

export class CareButtons {
  private container: Phaser.GameObjects.Container;
  private buttons: Record<CareActionType, Phaser.GameObjects.Text>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    callbacks: CareButtonsCallbacks
  ) {
    this.container = scene.add.container(x, y);
    this.buttons = {} as Record<CareActionType, Phaser.GameObjects.Text>;

    ACTION_TYPES.forEach((actionType, index) => {
      const bx = (index - 1) * BUTTON_SPACING;
      const button = scene.add
        .text(bx, 0, LABELS[actionType], {
          fontFamily: 'Arial Black',
          fontSize: 26,
          color: '#ffffff',
          backgroundColor: '#334155',
          padding: { x: 24, y: 14 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () =>
          button.setStyle({ backgroundColor: '#475569' })
        )
        .on('pointerout', () => button.setStyle({ backgroundColor: '#334155' }))
        .on('pointerdown', () => callbacks.onAction(actionType));

      // Disabled until the first successful load calls setRemaining, so a
      // visitor can't tap before we know their real daily caps.
      button.disableInteractive();
      button.setAlpha(0.4);

      this.buttons[actionType] = button;
      this.container.add(button);
    });
  }

  setRemaining(remaining: DailyActionCounts): void {
    for (const actionType of ACTION_TYPES) {
      const count = remaining[actionType];
      const button = this.buttons[actionType];
      button.setText(`${LABELS[actionType]} (${count})`);

      const disabled = count <= 0;
      button.setAlpha(disabled ? 0.4 : 1);
      button.disableInteractive();
      if (!disabled) {
        button.setInteractive({ useHandCursor: true });
      }
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
