import * as Phaser from 'phaser';
import type { Mood, MoodAxis } from '../../../shared/types';

const AXES: MoodAxis[] = ['contentment', 'affection', 'energy'];

const AXIS_COLOR: Record<MoodAxis, number> = {
  contentment: 0x4ade80,
  affection: 0xf472b6,
  energy: 0xfacc15,
};

const BAR_WIDTH = 160;
const BAR_HEIGHT = 14;
const ROW_HEIGHT = 26;

export class MoodBars {
  private container: Phaser.GameObjects.Container;
  private bars: Record<MoodAxis, Phaser.GameObjects.Graphics>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.bars = {} as Record<MoodAxis, Phaser.GameObjects.Graphics>;

    AXES.forEach((axis, index) => {
      const rowY = index * ROW_HEIGHT;

      const label = scene.add.text(-BAR_WIDTH / 2, rowY - 16, axis, {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#cbd5e1',
      });
      this.container.add(label);

      const track = scene.add.graphics();
      track.fillStyle(0x1e293b, 1);
      track.fillRoundedRect(-BAR_WIDTH / 2, rowY, BAR_WIDTH, BAR_HEIGHT, 4);
      this.container.add(track);

      const bar = scene.add.graphics();
      this.bars[axis] = bar;
      this.container.add(bar);
    });
  }

  setMood(mood: Mood): void {
    AXES.forEach((axis, index) => {
      const rowY = index * ROW_HEIGHT;
      const value = Phaser.Math.Clamp(mood[axis], 0, 100);
      const width = Math.max(4, (value / 100) * BAR_WIDTH);

      const bar = this.bars[axis];
      bar.clear();
      bar.fillStyle(AXIS_COLOR[axis], 1);
      bar.fillRoundedRect(-BAR_WIDTH / 2, rowY, width, BAR_HEIGHT, 4);
    });
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
