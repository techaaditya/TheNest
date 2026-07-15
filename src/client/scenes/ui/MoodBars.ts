import * as Phaser from 'phaser';
import type { Mood, MoodAxis } from '../../../shared/types';

const AXES: MoodAxis[] = ['contentment', 'affection', 'energy'];

const AXIS_COLOR: Record<MoodAxis, number> = {
  contentment: 0x35ab9f,
  affection: 0xd96c8a,
  energy: 0xc98f2d,
};

const AXIS_LABEL: Record<MoodAxis, string> = {
  contentment: 'Contentment',
  affection: 'Affection',
  energy: 'Energy',
};

const BAR_WIDTH = 210;
const BAR_HEIGHT = 14;
const BAR_LEFT = -55;
const ROW_HEIGHT = 30;

export class MoodBars {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bars: Record<MoodAxis, Phaser.GameObjects.Graphics>;
  private values: Record<MoodAxis, Phaser.GameObjects.Text>;
  /** Currently displayed value per axis, tweened toward the real value so bar changes animate instead of snapping. */
  private displayed: Record<MoodAxis, number>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.bars = {} as Record<MoodAxis, Phaser.GameObjects.Graphics>;
    this.values = {} as Record<MoodAxis, Phaser.GameObjects.Text>;
    this.displayed = { contentment: 0, affection: 0, energy: 0 };

    AXES.forEach((axis, index) => {
      const rowY = index * ROW_HEIGHT;

      const label = scene.add
        .text(BAR_LEFT - 12, rowY + BAR_HEIGHT / 2, AXIS_LABEL[axis], {
          fontFamily: 'Arial',
          fontSize: 13,
          color: '#5c5138',
        })
        .setOrigin(1, 0.5);
      this.container.add(label);

      const track = scene.add.graphics();
      track.fillStyle(0xd9be7e, 0.8);
      track.fillRoundedRect(BAR_LEFT, rowY, BAR_WIDTH, BAR_HEIGHT, 5);
      this.container.add(track);

      const bar = scene.add.graphics();
      this.bars[axis] = bar;
      this.container.add(bar);

      const value = scene.add
        .text(BAR_LEFT + BAR_WIDTH + 12, rowY + BAR_HEIGHT / 2, '', {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#8a7a4f',
        })
        .setOrigin(0, 0.5);
      this.values[axis] = value;
      this.container.add(value);
    });
  }

  setMood(mood: Mood): void {
    AXES.forEach((axis) => {
      const target = Phaser.Math.Clamp(mood[axis], 0, 100);
      const from = this.displayed[axis];
      if (from === target) {
        this.drawBar(axis, target);
        return;
      }

      this.scene.tweens.addCounter({
        from,
        to: target,
        duration: 450,
        ease: 'Cubic.Out',
        onUpdate: (tween) => {
          this.drawBar(axis, tween.getValue() ?? target);
        },
      });
      this.displayed[axis] = target;
    });
  }

  private drawBar(axis: MoodAxis, value: number): void {
    const rowY = AXES.indexOf(axis) * ROW_HEIGHT;
    const width = Math.max(5, (value / 100) * BAR_WIDTH);

    const bar = this.bars[axis];
    bar.clear();
    bar.fillStyle(AXIS_COLOR[axis], 1);
    bar.fillRoundedRect(BAR_LEFT, rowY, width, BAR_HEIGHT, 5);

    this.values[axis].setText(`${Math.round(value)}`);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
