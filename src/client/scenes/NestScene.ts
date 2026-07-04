import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { CareActionType, RealtimeCareMessage } from '../../shared/types';
import { fetchInit, fetchWhy, postCareAction } from '../net';
import { subscribeToCareActions } from '../realtime';
import { CreatureRenderer } from '../creature/CreatureRenderer';
import { CareButtons } from './ui/CareButtons';
import { MoodBars } from './ui/MoodBars';
import { ActivityPanel } from './ui/ActivityPanel';
import { WhyPanel } from './ui/WhyPanel';

export class NestScene extends Scene {
  private background: Phaser.GameObjects.Image;
  private titleText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private creature: CreatureRenderer;
  private moodBars: MoodBars;
  private careButtons: CareButtons;
  private activityPanel: ActivityPanel;
  private whyPanel: WhyPanel;
  private unsubscribeRealtime: (() => void) | null = null;

  constructor() {
    super('NestScene');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0f172a);
    this.background = this.add.image(512, 384, 'background').setAlpha(0.2);

    this.titleText = this.add
      .text(512, 60, 'Loading the Nest...', {
        fontFamily: 'Arial Black',
        fontSize: 22,
        color: '#e2e8f0',
        align: 'center',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(512, 690, '', {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#fbbf24',
        align: 'center',
      })
      .setOrigin(0.5);

    this.creature = new CreatureRenderer(this, 512, 260);
    this.moodBars = new MoodBars(this, 512, 420);
    this.careButtons = new CareButtons(this, 512, 540, {
      onAction: (actionType) => void this.handleCareAction(actionType),
    });
    this.activityPanel = new ActivityPanel(this, 512, 610);
    this.whyPanel = new WhyPanel(this, 512, 610);

    void this.refresh();

    this.unsubscribeRealtime = subscribeToCareActions((message) => {
      this.handleRealtimeCareAction(message);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRealtime?.();
    });

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });
  }

  private handleRealtimeCareAction(message: RealtimeCareMessage): void {
    this.moodBars.setMood(message.mood);
    this.activityPanel.prependActivity({
      userDisplay: message.userDisplay,
      actionType: message.actionType,
      ts: message.ts,
    });
  }

  private async refresh(): Promise<void> {
    try {
      const [{ nest, remaining, activity }, why] = await Promise.all([
        fetchInit(),
        fetchWhy(),
      ]);
      this.creature.render(nest.traits);
      this.moodBars.setMood(nest.mood);
      this.careButtons.setRemaining(remaining);
      this.activityPanel.setActivity(activity);
      this.whyPanel.setWhy(why);
      this.titleText.setText(nest.creatureId);
    } catch (error) {
      console.error('Failed to load the Nest:', error);
      this.titleText.setText('Failed to load the Nest.');
    }
  }

  private async handleCareAction(actionType: CareActionType): Promise<void> {
    const result = await postCareAction(actionType);

    if ('error' in result) {
      this.statusText.setText(
        "You're out of that action for today — come back tomorrow!"
      );
      return;
    }

    this.statusText.setText('');
    await this.refresh();
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

    this.titleText.setPosition(width / 2, height * 0.08);
    this.titleText.setScale(scaleFactor);

    this.creature.setPosition(width / 2, height * 0.32);
    this.creature.setScale(scaleFactor);

    this.moodBars.setPosition(width / 2, height * 0.54);
    this.moodBars.setScale(scaleFactor);

    this.careButtons.setPosition(width / 2, height * 0.68);
    this.careButtons.setScale(scaleFactor);

    this.activityPanel.setPosition(
      width / 2 - 260 * scaleFactor,
      height * 0.78
    );
    this.activityPanel.setScale(scaleFactor);

    this.whyPanel.setPosition(width / 2 + 60 * scaleFactor, height * 0.78);
    this.whyPanel.setScale(scaleFactor);

    this.statusText.setPosition(width / 2, height * 0.92);
    this.statusText.setScale(scaleFactor);
  }
}
