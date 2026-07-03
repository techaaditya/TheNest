import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/types';

// Placeholder rendering until the layered/tinted CreatureRenderer lands (build Phase 3).
// This scene's only job right now is to prove the client boots against real Nest state.
export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  statusText: Phaser.GameObjects.Text;
  goButton: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);

    this.background = this.add.image(512, 384, 'background').setAlpha(0.25);

    this.statusText = this.add
      .text(512, 340, 'Loading the Nest...', {
        fontFamily: 'Arial Black',
        fontSize: 32,
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    void (async () => {
      try {
        const response = await fetch('/api/init');
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = (await response.json()) as InitResponse;
        const { nest } = data;
        this.statusText.setText(
          `${nest.creatureId}\n${nest.traits.color} ${nest.traits.base}\ncontentment ${nest.mood.contentment} · affection ${nest.mood.affection} · energy ${nest.mood.energy}`
        );
      } catch (error) {
        console.error('Failed to fetch Nest state:', error);
        this.statusText.setText('Failed to load the Nest.');
      }
    })();

    const createButton = (
      y: number,
      label: string,
      color: string,
      onClick: () => void
    ) => {
      const button = this.add
        .text(512, y, label, {
          fontFamily: 'Arial Black',
          fontSize: 36,
          color: color,
          backgroundColor: '#444444',
          padding: {
            x: 25,
            y: 12,
          } as Phaser.Types.GameObjects.Text.TextPadding,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () =>
          button.setStyle({ backgroundColor: '#555555' })
        )
        .on('pointerout', () => button.setStyle({ backgroundColor: '#444444' }))
        .on('pointerdown', onClick);
      return button;
    };

    this.goButton = createButton(
      this.scale.height * 0.65,
      'Game Over',
      '#ffffff',
      () => {
        this.scene.start('GameOver');
      }
    );

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });
  }

  updateLayout(width: number, height: number) {
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

    if (this.statusText) {
      this.statusText.setPosition(width / 2, height * 0.45);
      this.statusText.setScale(scaleFactor);
    }

    if (this.goButton) {
      this.goButton.setPosition(width / 2, height * 0.65);
      this.goButton.setScale(scaleFactor);
    }
  }
}
