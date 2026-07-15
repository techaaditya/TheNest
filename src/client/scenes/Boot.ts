import { Scene } from 'phaser';

/** Nothing to preload — the creature and all UI are generated procedurally —
 * so Boot exists only as the conventional entry point for future assets. */
export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('NestScene');
  }
}
