/**
 * CommandPop: cute popping "shout" bubble when a hero uses a command (Attack, Guard, Switch, Pass).
 */
import { GAME_FONT } from '../config/constants.js';

const DEPTH = 610;
const FONT_SIZE = 14;
const PADDING_X = 16;
const PADDING_Y = 10;
const OFFSET_Y = -95;
const POP_DURATION = 220;
const HOLD_MS = 500;
const FADE_DURATION = 250;
const EASE_POP = 'Back.easeOut';
const EASE_FADE = 'Power2.In';

/**
 * Show a command pop above the given position (e.g. hero card center).
 * @param {Phaser.Scene} scene
 * @param {number} x - World x (e.g. card center)
 * @param {number} y - World y (e.g. card center)
 * @param {string} label - e.g. 'Attack!', 'Guard!', 'Switch!', 'Pass!'
 */
export function showCommandPop(scene, x, y, label) {
  const popY = y + OFFSET_Y;

  const bubbleWidth = Math.max(80, label.length * 10 + PADDING_X * 2);
  const bubbleHeight = FONT_SIZE + PADDING_Y * 2;

  const container = scene.add.container(x, popY).setDepth(DEPTH);

  const bubble = scene.add
    .graphics()
    .fillStyle(0x2c3e50, 0.95)
    .fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 8)
    .lineStyle(2, 0x3498db, 1)
    .strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);

  const text = scene.add
    .text(0, 0, label, {
      fontSize: FONT_SIZE,
      fontFamily: GAME_FONT,
      color: '#f1c40f',
    })
    .setOrigin(0.5);

  container.add([bubble, text]);
  container.setScale(0);

  scene.tweens.add({
    targets: container,
    scale: 1.15,
    duration: POP_DURATION,
    ease: EASE_POP,
  });

  scene.time.delayedCall(POP_DURATION + HOLD_MS, () => {
    scene.tweens.add({
      targets: container,
      scale: 0.6,
      alpha: 0,
      duration: FADE_DURATION,
      ease: EASE_FADE,
      onComplete: () => container.destroy(),
    });
  });
}
