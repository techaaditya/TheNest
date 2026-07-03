import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { NestState } from '../../shared/types';
import { fetchInit } from '../net';
import { CreatureRenderer } from '../creature/CreatureRenderer';

export class NestScene extends Scene {
  private background: Phaser.GameObjects.Image;
  private statusText: Phaser.GameObjects.Text;
  private creature: CreatureRenderer;

  constructor() {
    super('NestScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0f172a);
    this.background = this.add.image(512, 384, 'background').setAlpha(0.2);

    this.statusText = this.add
      .text(512, 620, 'Loading the Nest...', {
        fontFamily: 'Arial Black',
        fontSize: 22,
        color: '#e2e8f0',
        align: 'center',
      })
      .setOrigin(0.5);

    this.creature = new CreatureRenderer(this, 512, 340);

    void this.loadNest();

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });
  }

  private async loadNest(): Promise<void> {
    try {
      const { nest } = await fetchInit();
      this.creature.render(nest.traits);
      this.statusText.setText(this.describeNest(nest));
    } catch (error) {
      console.error('Failed to load the Nest:', error);
      this.statusText.setText('Failed to load the Nest.');
    }
  }

  private describeNest(nest: NestState): string {
    return `${nest.creatureId}\ncontentment ${nest.mood.contentment} · affection ${nest.mood.affection} · energy ${nest.mood.energy}`;
  }

  private updateLayout(width: number, height: number): void {
    this.cameras.resize(width, height);

    if (this.background) {
      this.background.setPosition(width / 2, height / 2);
      if (this.background.width && this.background.height) {
        const scale = Math.max(
          width / this.background.width,
          height / this.background.height
        );
        this.background.setScale(scale);
      }
    }

    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    this.creature.setPosition(width / 2, height * 0.42);
    this.creature.setScale(scaleFactor);

    if (this.statusText) {
      this.statusText.setPosition(width / 2, height * 0.8);
      this.statusText.setScale(scaleFactor);
    }
  }
}
