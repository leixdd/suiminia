/**
 * Phaser 3.90.0 game entry.
 * Scene order: Boot -> Preload -> BattleScene.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { BattleScene } from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, BattleScene],
};

const game = new Phaser.Game(config);

// Refresh scale when the browser window is resized so the canvas stays responsive
function onResize() {
  if (game.scale) {
    game.scale.refresh();
  }
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
