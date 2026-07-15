import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { context } from '@devvit/web/client';
import type { CareActionType, RealtimeCareMessage } from '../../shared/types';
import { fetchInit, fetchNaming, fetchWhy, postCareAction } from '../net';
import { subscribeToCareActions } from '../realtime';
import { CreatureRenderer } from '../creature/CreatureRenderer';
import { ACTION_EMOJI, CareButtons } from './ui/CareButtons';
import { MoodBars } from './ui/MoodBars';
import { ActivityPanel } from './ui/ActivityPanel';
import { WhyPanel } from './ui/WhyPanel';
import { NamingPanel } from './ui/NamingPanel';
import { OnboardingBanner } from './ui/OnboardingBanner';

const DAY_MS = 24 * 60 * 60 * 1000;

export class NestScene extends Scene {
  private backgroundFill: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private creature: CreatureRenderer;
  private moodBars: MoodBars;
  private careButtons: CareButtons;
  private activityPanel: ActivityPanel;
  private whyPanel: WhyPanel;
  private namingPanel: NamingPanel;
  private onboardingBanner: OnboardingBanner;
  private unsubscribeRealtime: (() => void) | null = null;
  private lastKnownMutationCount: number | null = null;

  constructor() {
    super('NestScene');
  }

  create() {
    this.backgroundFill = this.add.graphics();
    this.spawnStars();

    this.titleText = this.add
      .text(512, 40, `The Nest of r/${context.subredditName}`, {
        fontFamily: 'Arial Black',
        fontSize: 24,
        color: '#f1f5f9',
        align: 'center',
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(512, 70, 'Waking it up...', {
        fontFamily: 'Arial',
        fontSize: 13,
        color: '#7dd3fc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(512, 690, '', {
        fontFamily: 'Arial',
        fontSize: 15,
        color: '#fbbf24',
        align: 'center',
      })
      .setOrigin(0.5);

    this.creature = new CreatureRenderer(this, 512, 260);
    this.moodBars = new MoodBars(this, 512, 420);
    this.careButtons = new CareButtons(this, 512, 540, {
      onAction: (actionType) => void this.handleCareAction(actionType),
    });
    this.activityPanel = new ActivityPanel(this, 342, 620);
    this.whyPanel = new WhyPanel(this, 682, 620);
    this.namingPanel = new NamingPanel(this, 512, 720);
    this.onboardingBanner = new OnboardingBanner(this, 512, 120);

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
    this.creature.playCareReaction(message.actionType);
    this.spawnCareEmoji(message.actionType);
  }

  private async refresh(): Promise<void> {
    try {
      const [{ nest, remaining, activity }, why, naming] = await Promise.all([
        fetchInit(),
        fetchWhy(),
        fetchNaming(),
      ]);
      this.creature.render(nest.traits);
      this.moodBars.setMood(nest.mood);
      this.careButtons.setRemaining(remaining);
      this.activityPanel.setActivity(activity);
      this.whyPanel.setWhy(why);
      this.namingPanel.setNaming(naming);

      const dayNumber = Math.max(
        1,
        Math.floor((Date.now() - Date.parse(nest.createdAt)) / DAY_MS) + 1
      );
      const mutationCount = nest.mutationHistory.length;
      this.subtitleText.setText(
        `Day ${dayNumber} · ${mutationCount} mutation${mutationCount === 1 ? '' : 's'} · raised by this community`
      );

      if (
        this.lastKnownMutationCount !== null &&
        mutationCount > this.lastKnownMutationCount
      ) {
        this.creature.playMutationTransition();
      }
      this.lastKnownMutationCount = mutationCount;
    } catch (error) {
      console.error('Failed to load the Nest:', error);
      this.subtitleText.setText('Failed to load the Nest — try refreshing.');
    }
  }

  private async handleCareAction(actionType: CareActionType): Promise<void> {
    // React immediately so the tap feels alive; the server round-trip
    // reconciles caps, mood, and activity right after.
    this.creature.playCareReaction(actionType);
    this.spawnCareEmoji(actionType);

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

  /** A little burst of the action's emoji floating up from the creature. */
  private spawnCareEmoji(actionType: CareActionType): void {
    const { width, height } = this.scale;
    const originX = width / 2 + Phaser.Math.Between(-46, 46);
    const originY = height * 0.32 + Phaser.Math.Between(-16, 8);

    const emoji = this.add
      .text(originX, originY, ACTION_EMOJI[actionType], { fontSize: 26 })
      .setOrigin(0.5);

    this.tweens.add({
      targets: emoji,
      y: originY - 90,
      alpha: 0,
      scale: 1.4,
      duration: 900,
      ease: 'Cubic.Out',
      onComplete: () => emoji.destroy(),
    });
  }

  /** Faint drifting stars so the sky reads as a place, not a flat fill. */
  private spawnStars(): void {
    const starKey = 'nest-star';
    if (!this.textures.exists(starKey)) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture(starKey, 4, 4);
      g.destroy();
    }

    for (let i = 0; i < 46; i++) {
      const star = this.add.image(
        Phaser.Math.Between(0, 1920),
        Phaser.Math.Between(0, 1080),
        starKey
      );
      star.setAlpha(Phaser.Math.FloatBetween(0.08, 0.4));
      star.setScale(Phaser.Math.FloatBetween(0.5, 1.2));

      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.02, 0.15),
        duration: Phaser.Math.Between(1400, 3200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private updateLayout(width: number, height: number): void {
    this.cameras.resize(width, height);

    this.backgroundFill.clear();
    this.backgroundFill.fillGradientStyle(
      0x0b1023,
      0x0b1023,
      0x1c2f52,
      0x18294a,
      1
    );
    this.backgroundFill.fillRect(0, 0, width, height);

    // Floor the scale so buttons and text stay legible/tappable on narrow
    // mobile viewports rather than shrinking indefinitely with aspect ratio.
    const scaleFactor = Math.max(
      0.55,
      Math.min(Math.min(width / 1024, height / 768), 1)
    );

    this.titleText.setPosition(width / 2, height * 0.05);
    this.titleText.setScale(scaleFactor);

    this.subtitleText.setPosition(width / 2, height * 0.095);
    this.subtitleText.setScale(scaleFactor);

    this.onboardingBanner.setPosition(width / 2, height * 0.185);
    this.onboardingBanner.setScale(scaleFactor);

    this.creature.setPosition(width / 2, height * 0.32);
    this.creature.setScale(scaleFactor);

    this.moodBars.setPosition(width / 2, height * 0.485);
    this.moodBars.setScale(scaleFactor);

    this.careButtons.setPosition(width / 2, height * 0.635);
    this.careButtons.setScale(scaleFactor);

    this.statusText.setPosition(width / 2, height * 0.7);
    this.statusText.setScale(scaleFactor);

    this.activityPanel.setPosition(
      width / 2 - 172 * scaleFactor,
      height * 0.815
    );
    this.activityPanel.setScale(scaleFactor);

    this.whyPanel.setPosition(width / 2 + 172 * scaleFactor, height * 0.815);
    this.whyPanel.setScale(scaleFactor);

    this.namingPanel.setPosition(width / 2, height * 0.945);
    this.namingPanel.setScale(scaleFactor);
  }
}
