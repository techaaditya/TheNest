import * as Phaser from 'phaser';

const ONBOARDING_KEY = 'the-nest:onboarding-dismissed';

const hasSeenOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    // Storage blocked (e.g. sandboxed webview) — don't force the banner every visit.
    return true;
  }
};

const markOnboardingSeen = (): void => {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Nothing we can do if storage is blocked; the banner will just reappear.
  }
};

/** A one-time, dismissible explainer shown on a visitor's first visit so a
 * short first look at the post still makes sense (doc §14). */
export class OnboardingBanner {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);

    if (hasSeenOnboarding()) {
      this.container.setVisible(false);
      return;
    }

    const bg = scene.add.graphics();
    bg.fillStyle(0x47828e, 0.96);
    bg.lineStyle(2, 0x386874, 1);
    bg.fillRoundedRect(-260, -50, 520, 100, 12);
    bg.strokeRoundedRect(-260, -50, 520, 100, 12);
    this.container.add(bg);

    const text = scene.add
      .text(
        0,
        -16,
        "Feed, pet, and play with your subreddit's Nest using three shared daily actions. Community mood shapes how it mutates overnight!",
        {
          fontFamily: 'Arial',
          fontSize: 13,
          color: '#fcf2c6',
          align: 'center',
          wordWrap: { width: 470 },
        }
      )
      .setOrigin(0.5, 0.5);
    this.container.add(text);

    const dismiss = scene.add
      .text(0, 30, 'Got it', {
        fontFamily: 'Arial Black',
        fontSize: 13,
        color: '#2e5560',
        backgroundColor: '#fcf2c6',
        padding: { x: 16, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        markOnboardingSeen();
        this.container.setVisible(false);
      });
    this.container.add(dismiss);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }
}
