/**
 * VictoryOverlay: shows victory / defeat / draw message.
 */
import { GAME_WIDTH, GAME_FONT, FONT_SIZE_VICTORY } from '../config/constants.js';

const DEPTH = 550;

export class VictoryOverlay {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.text = scene.add
      .text(GAME_WIDTH / 2, 60, '', {
        fontSize: FONT_SIZE_VICTORY,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTH);
  }

  /**
   * @param {'player' | 'enemy' | null} winner
   */
  show(winner) {
    const message =
      winner === 'player' ? 'You win!' : winner === 'enemy' ? 'Enemy wins!' : 'Draw!';
    this.text.setText(message).setVisible(true);
  }

  hide() {
    this.text.setVisible(false);
  }
}
