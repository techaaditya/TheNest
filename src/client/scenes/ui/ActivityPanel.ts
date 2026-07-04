import * as Phaser from 'phaser';
import type { ActivityItem, CareActionType } from '../../../shared/types';

const ACTION_VERB: Record<CareActionType, string> = {
  feed: 'fed',
  pet: 'petted',
  play: 'played with',
};

const MAX_VISIBLE_ITEMS = 6;
const EMPTY_MESSAGE = 'No activity yet — be the first to care for the Nest.';

export class ActivityPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private items: ActivityItem[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.text = scene.add.text(0, 0, EMPTY_MESSAGE, {
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#94a3b8',
      align: 'left',
      lineSpacing: 6,
    });
    this.container.add(this.text);
  }

  setActivity(activity: ActivityItem[]): void {
    this.items = activity.slice(0, MAX_VISIBLE_ITEMS);
    this.render();
  }

  /** Prepends a single live item (e.g. from a realtime broadcast) without a full refetch. */
  prependActivity(item: ActivityItem): void {
    this.items = [item, ...this.items].slice(0, MAX_VISIBLE_ITEMS);
    this.render();
  }

  private render(): void {
    if (this.items.length === 0) {
      this.text.setText(EMPTY_MESSAGE);
      return;
    }

    const lines = this.items.map(
      (item) => `${item.userDisplay} ${ACTION_VERB[item.actionType]} the Nest`
    );
    this.text.setText(lines.join('\n'));
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
