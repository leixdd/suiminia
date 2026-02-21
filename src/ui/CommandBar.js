/**
 * CommandBar: bottom bar with feedback text (instructions) and Guard / Attack / Switch buttons.
 */
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_FONT,
  COMMAND_WINDOW_FONT,
  COMMAND_WINDOW_FONT_SIZE,
  FONT_SIZE_DEBUG_UI,
} from '../config/constants.js';

const UI_DEPTH = 500;
const BAR_HEIGHT = 56;
const GAP = 4;
const FEEDBACK_WIDTH = (GAME_WIDTH * 4) / 12;
const COMMAND_WIDTH = (GAME_WIDTH * 8) / 12;
const BTN_W = 88;
const BTN_H = 40;
const BTN_GAP = 12;

export class CommandBar {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ onAttack: () => void, onGuard: () => void, onSwitch: () => void }} callbacks
   */
  constructor(scene, callbacks) {
    this.scene = scene;
    this.onAttack = callbacks.onAttack;
    this.onGuard = callbacks.onGuard;
    this.onSwitch = callbacks.onSwitch;

    const bottomBarY = GAME_HEIGHT - BAR_HEIGHT / 2;
    const feedbackCenterX = FEEDBACK_WIDTH / 2;
    const commandCenterX = GAME_WIDTH * (4 / 12) + COMMAND_WIDTH / 2;

    scene.add
      .rectangle(feedbackCenterX, bottomBarY, FEEDBACK_WIDTH - GAP / 2, BAR_HEIGHT, 0x2c3e50, 0.95)
      .setStrokeStyle(2, 0x5d6d7e)
      .setDepth(UI_DEPTH);

    this.instructionText = scene.add
      .text(feedbackCenterX, bottomBarY - 14, 'Waiting for a turn.', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: FEEDBACK_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(UI_DEPTH + 1);
    this.instructionSubtext = scene.add
      .text(feedbackCenterX, bottomBarY + 4, '', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: FEEDBACK_WIDTH - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(UI_DEPTH + 1);

    const switchX = commandCenterX - BTN_GAP - BTN_W;
    const guardX = commandCenterX;
    const attackX = commandCenterX + BTN_GAP + BTN_W;

    this.switchBtn = this._addButton(switchX, bottomBarY, 'Switch', 0x9b59b6, () => this.onSwitch());
    this.switchBtnText = this._addButtonText(switchX, bottomBarY, 'Switch');
    this.guardBtn = this._addButton(guardX, bottomBarY, 'Guard', 0x3498db, () => this.onGuard());
    this.guardBtnText = this._addButtonText(guardX, bottomBarY, 'Guard');
    this.attackBtn = this._addButton(attackX, bottomBarY, 'Attack', 0x2ecc71, () => this.onAttack());
    this.attackBtnText = this._addButtonText(attackX, bottomBarY, 'Attack');
  }

  _addButton(x, y, label, color, onClick) {
    const btn = this.scene.add
      .rectangle(x, y, BTN_W, BTN_H, color)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(UI_DEPTH + 1);
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setAlpha(0.9));
    btn.on('pointerout', () => btn.setAlpha(1));
    return btn;
  }

  _addButtonText(x, y, text) {
    return this.scene.add
      .text(x, y, text, {
        fontSize: COMMAND_WINDOW_FONT_SIZE,
        fontFamily: COMMAND_WINDOW_FONT,
        color: '#fff',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(UI_DEPTH + 1);
  }

  setInstructions(text, subtext = '') {
    this.instructionText.setText(text);
    this.instructionSubtext.setText(subtext);
  }

  setButtonsVisible(visible) {
    this.attackBtn.setVisible(visible);
    this.attackBtnText.setVisible(visible);
    this.guardBtn.setVisible(visible);
    this.guardBtnText.setVisible(visible);
    this.switchBtn.setVisible(visible);
    this.switchBtnText.setVisible(visible);
  }
}
