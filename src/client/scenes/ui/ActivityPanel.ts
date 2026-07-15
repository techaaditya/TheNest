import * as Phaser from 'phaser';
import type { ActivityItem, CareActionType } from '../../../shared/types';
import { addCardChrome } from './card';

const ACTION_VERB: Record<CareActionType, string> = {
  feed: 'fed',
  pet: 'petted',
  play: 'played with',
};

const MAX_VISIBLE_ITEMS = 5;
const EMPTY_MESSAGE = 'No activity yet!\nBe the first to care for the Nest.';

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 168;

const timeAgo = (ts: number): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export class ActivityPanel {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private items: ActivityItem[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    addCardChrome(
      scene,
      this.container,
      CARD_WIDTH,
      CARD_HEIGHT,
      '💬 Recent care',
      '#47828e'
    );

    this.text = scene.add.text(
      -CARD_WIDTH / 2 + 14,
      -CARD_HEIGHT / 2 + 38,
      EMPTY_MESSAGE,
      {
        fontFamily: 'Arial',
        fontSize: 13,
        color: '#5c5138',
        align: 'left',
        lineSpacing: 8,
        wordWrap: { width: CARD_WIDTH - 28 },
      }
    );
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
      (item) =>
        `${item.userDisplay} ${ACTION_VERB[item.actionType]} the Nest · ${timeAgo(item.ts)}`
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
