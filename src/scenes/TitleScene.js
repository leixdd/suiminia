/**
 * TitleScene: title screen with game name and start prompt.
 * Click or press Enter/Space to start the battle.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_FONT } from '../config/constants.js';

const TITLE_FONT_SIZE = 28;
const PROMPT_FONT_SIZE = 10;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' });
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const title = this.add
      .text(cx, cy - 40, 'SuiMinia', {
        fontSize: TITLE_FONT_SIZE,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5, 0.5);

    const prompt = this.add
      .text(cx, cy + 40, 'Click or press Enter / Space to start', {
        fontSize: PROMPT_FONT_SIZE,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0.5);

    const start = () => this.scene.start('Battle');

    this.input.on('pointerdown', start);

    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
  }
}
