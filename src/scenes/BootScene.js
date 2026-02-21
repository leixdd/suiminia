/**
 * BootScene: minimal setup before preload (e.g. scale, device checks).
 * Phaser 3.90.0 calls this first; we then start PreloadScene.
 */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Optional: load a tiny asset or config here so the loader is ready
  }

  create() {
    this.scene.start('Preload');
  }
}
