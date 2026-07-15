import * as Phaser from 'phaser';
import type { NamingStatusResponse } from '../../../shared/types';
import { CARD_FILL, CARD_STROKE } from './card';

const NO_MUTATION_MESSAGE =
  '🏷️ No mutations yet — keep caring for the Nest.';

const BANNER_WIDTH = 560;
const BANNER_HEIGHT = 44;

const hoursUntil = (iso: string): number =>
  Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / (60 * 60 * 1000)));

/** A slim one-line banner tracking the community naming of the latest mutation. */
export class NamingPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(CARD_FILL, 0.92);
    bg.fillRoundedRect(
      -BANNER_WIDTH / 2,
      -BANNER_HEIGHT / 2,
      BANNER_WIDTH,
      BANNER_HEIGHT,
      12
    );
    bg.lineStyle(1.5, CARD_STROKE, 1);
    bg.strokeRoundedRect(
      -BANNER_WIDTH / 2,
      -BANNER_HEIGHT / 2,
      BANNER_WIDTH,
      BANNER_HEIGHT,
      12
    );
    this.container.add(bg);

    this.text = scene.add
      .text(0, 0, NO_MUTATION_MESSAGE, {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#a5b4fc',
        align: 'center',
        wordWrap: { width: BANNER_WIDTH - 32 },
      })
      .setOrigin(0.5);
    this.container.add(this.text);
  }

  setNaming(naming: NamingStatusResponse): void {
    if (!naming.latestMutation) {
      this.text.setText(NO_MUTATION_MESSAGE);
      return;
    }

    if (naming.latestMutation.name) {
      this.text.setText(
        `🏷️ Named "${naming.latestMutation.name}" by the community!`
      );
      return;
    }

    if (naming.window) {
      const hoursLeft = hoursUntil(naming.window.closesAt);
      this.text.setText(
        `🏷️ Naming in progress — reply in the comments to suggest a name (~${hoursLeft}h left)`
      );
      return;
    }

    this.text.setText('🏷️ This mutation went unnamed.');
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
