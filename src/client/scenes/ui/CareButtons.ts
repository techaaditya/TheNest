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

export const ACTION_EMOJI: Record<CareActionType, string> = {
  feed: '🍓',
  pet: '💗',
  play: '⚽',
};

const BUTTON_WIDTH = 150;
const BUTTON_HEIGHT = 58;
const BUTTON_SPACING = 168;

const FILL_IDLE = 0x2b3a55;
const FILL_HOVER = 0x3a4d70;
const STROKE = 0x4a5f88;

type Button = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  count: Phaser.GameObjects.Text;
  enabled: boolean;
};

export class CareButtons {
  private container: Phaser.GameObjects.Container;
  private buttons: Record<CareActionType, Button>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    callbacks: CareButtonsCallbacks
  ) {
    this.container = scene.add.container(x, y);
    this.buttons = {} as Record<CareActionType, Button>;

    ACTION_TYPES.forEach((actionType, index) => {
      const bx = (index - 1) * BUTTON_SPACING;
      const buttonContainer = scene.add.container(bx, 0);

      const bg = scene.add.graphics();
      this.drawButtonBg(bg, FILL_IDLE);
      buttonContainer.add(bg);

      const label = scene.add
        .text(0, -10, `${ACTION_EMOJI[actionType]} ${LABELS[actionType]}`, {
          fontFamily: 'Arial Black',
          fontSize: 19,
          color: '#f1f5f9',
        })
        .setOrigin(0.5);
      buttonContainer.add(label);

      const count = scene.add
        .text(0, 16, '', {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#94a3b8',
        })
        .setOrigin(0.5);
      buttonContainer.add(count);

      const button: Button = { container: buttonContainer, bg, count, enabled: false };

      bg.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(
          -BUTTON_WIDTH / 2,
          -BUTTON_HEIGHT / 2,
          BUTTON_WIDTH,
          BUTTON_HEIGHT
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
        .on('pointerover', () => {
          if (button.enabled) this.drawButtonBg(bg, FILL_HOVER);
        })
        .on('pointerout', () => {
          this.drawButtonBg(bg, FILL_IDLE);
          buttonContainer.setScale(1);
        })
        .on('pointerdown', () => {
          if (button.enabled) buttonContainer.setScale(0.94);
        })
        .on('pointerup', () => {
          if (!button.enabled) return;
          buttonContainer.setScale(1);
          callbacks.onAction(actionType);
        });

      // Disabled until the first successful load calls setRemaining, so a
      // visitor can't tap before we know their real daily caps.
      this.setButtonEnabled(button, false);

      this.buttons[actionType] = button;
      this.container.add(buttonContainer);
    });
  }

  setRemaining(remaining: DailyActionCounts): void {
    for (const actionType of ACTION_TYPES) {
      const left = remaining[actionType];
      const button = this.buttons[actionType];
      button.count.setText(
        left > 0 ? `${left} left today` : 'back tomorrow'
      );
      this.setButtonEnabled(button, left > 0);
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  private drawButtonBg(bg: Phaser.GameObjects.Graphics, fill: number): void {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      16
    );
    bg.lineStyle(1.5, STROKE, 1);
    bg.strokeRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      16
    );
  }

  private setButtonEnabled(button: Button, enabled: boolean): void {
    button.enabled = enabled;
    button.container.setAlpha(enabled ? 1 : 0.45);
  }
}
