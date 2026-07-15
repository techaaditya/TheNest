// Shared card chrome for the info panels so they all read as one design
// system: a rounded slate card with a small bold header.

import type * as Phaser from 'phaser';

export const CARD_FILL = 0x111f38;
export const CARD_STROKE = 0x33456b;

export const addCardChrome = (
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
  header: string,
  headerColor: string
): void => {
  const bg = scene.add.graphics();
  bg.fillStyle(CARD_FILL, 0.92);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
  bg.lineStyle(1.5, CARD_STROKE, 1);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
  container.add(bg);

  const headerText = scene.add.text(-width / 2 + 14, -height / 2 + 11, header, {
    fontFamily: 'Arial Black',
    fontSize: 13,
    color: headerColor,
  });
  container.add(headerText);
};
