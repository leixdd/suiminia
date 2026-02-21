/**
 * PreloadScene: load shared assets (images, atlases, audio) for battle.
 * Uses Phaser 3.90.0 Loader API. Add your assets here, then start BattleScene.
 */
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Placeholder: create a simple graphic so we don't rely on external files
    // In production, use this.load.image(), this.load.atlas(), etc.
    const w = 64;
    const h = 64;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4a90d9, 1);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 8);
    g.generateTexture('hero-placeholder', w, h);
    g.destroy();

    // Second placeholder (slightly different color for P2)
    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.fillStyle(0xd94a4a, 1);
    g2.fillRoundedRect(0, 0, w, h, 8);
    g2.lineStyle(2, 0xffffff, 0.8);
    g2.strokeRoundedRect(1, 1, w - 2, h - 2, 8);
    g2.generateTexture('hero-placeholder-p2', w, h);
    g2.destroy();
  }

  create() {
    this.scene.start('Title');
  }
}
