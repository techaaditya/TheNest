import * as Phaser from 'phaser';
import type { NamingStatusResponse } from '../../../shared/types';

const NO_MUTATION_MESSAGE = 'No mutations yet — keep caring for the Nest.';

const hoursUntil = (iso: string): number =>
  Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / (60 * 60 * 1000)));

export class NamingPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.text = scene.add.text(0, 0, NO_MUTATION_MESSAGE, {
      fontFamily: 'Arial',
      fontSize: 13,
      color: '#a5b4fc',
      align: 'left',
      lineSpacing: 4,
    });
    this.container.add(this.text);
  }

  setNaming(naming: NamingStatusResponse): void {
    if (!naming.latestMutation) {
      this.text.setText(NO_MUTATION_MESSAGE);
      return;
    }

    if (naming.latestMutation.name) {
      this.text.setText(`Named "${naming.latestMutation.name}" by the community!`);
      return;
    }

    if (naming.window) {
      const hoursLeft = hoursUntil(naming.window.closesAt);
      this.text.setText(
        `Naming in progress — reply in the thread to suggest a name (~${hoursLeft}h left)`
      );
      return;
    }

    this.text.setText('This mutation was not named.');
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
