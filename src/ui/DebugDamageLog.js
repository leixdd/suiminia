/**
 * DebugDamageLog: scrollable damage calculation log panel.
 */
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_FONT,
  FONT_SIZE_DEBUG_UI,
  GUARD_DEF_MULTIPLIER,
  STAGGERED_DAMAGE_MULTIPLIER,
} from '../config/constants.js';

const DEPTH = 450;
const LOG_HEIGHT = 72;
const LOG_WIDTH = GAME_WIDTH - 32;
const LINE_HEIGHT = 14;
const MAX_LINES = 32;
const PADDING = 8;
const BAR_HEIGHT = 56;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class DebugDamageLog {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    const bottomBarY = GAME_HEIGHT - BAR_HEIGHT / 2;
    const centerX = GAME_WIDTH / 2;
    const logY = bottomBarY - BAR_HEIGHT / 2 - LOG_HEIGHT / 2 - 8;
    const contentTop = logY - LOG_HEIGHT / 2 + 18;
    const contentHeight = LOG_HEIGHT - 24;

    scene.add
      .rectangle(centerX, logY, LOG_WIDTH, LOG_HEIGHT, 0x0d1117, 0.95)
      .setStrokeStyle(1, 0x30363d)
      .setDepth(DEPTH);
    scene.add
      .text(centerX, logY - LOG_HEIGHT / 2 + 4, 'Damage (debug)', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 1);

    this.entries = [];
    this.scroll = 0;
    this.contentHeight = 0;
    this.container = scene.add
      .container(centerX - LOG_WIDTH / 2 + PADDING, contentTop)
      .setDepth(DEPTH + 1);

    const maskGraphics = scene.make.graphics({ add: false });
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(
      centerX - LOG_WIDTH / 2 + PADDING,
      contentTop - 2,
      LOG_WIDTH - PADDING * 2,
      contentHeight + 4
    );
    this.container.setMask(maskGraphics.createGeometryMask());

    this.bounds = {
      left: centerX - LOG_WIDTH / 2,
      right: centerX + LOG_WIDTH / 2,
      top: logY - LOG_HEIGHT / 2,
      bottom: logY + LOG_HEIGHT / 2,
    };
    this.contentTop = contentTop;
    this.contentHeightVal = contentHeight;
    this.lineHeight = LINE_HEIGHT;
    this.maxLines = MAX_LINES;

    const scrollBy = (delta) => {
      const maxScroll = Math.max(0, this.contentHeight - this.contentHeightVal);
      this.scroll = Phaser.Math.Clamp(this.scroll + delta, 0, maxScroll);
      this._updateScroll();
    };

    scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const { left, right, top, bottom } = this.bounds;
      if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) {
        scrollBy(deltaY);
      }
    });

    const keyDown = (event) => {
      const maxScroll = Math.max(0, this.contentHeight - this.contentHeightVal);
      if (maxScroll <= 0) return;
      const step = this.lineHeight * 2;
      if (event.keyCode === 38) {
        event.preventDefault();
        scrollBy(step);
      } else if (event.keyCode === 40) {
        event.preventDefault();
        scrollBy(-step);
      }
    };
    scene.input.keyboard.on('keydown', keyDown);
    this._keydownListener = keyDown;
  }

  destroy() {
    if (this._keydownListener) {
      this.scene.input.keyboard.off('keydown', this._keydownListener);
    }
  }

  /**
   * @param {{ atk: number, baseDef?: number, effectiveDef: number, damage: number, attacker: { name: string }, target: { name: string }, guarded?: boolean, targetWasStaggered?: boolean }} result
   */
  addEntry(result) {
    if (result.attacker == null || result.atk == null || result.effectiveDef == null) return;
    const heroName = result.attacker.name;
    const command = 'Attack';
    const base = `(${result.atk} - ${fmtNum(result.effectiveDef)})`;
    const guardStr = result.guarded ? ` [guard ×${GUARD_DEF_MULTIPLIER}]` : '';
    const staggerStr = result.targetWasStaggered ? ` [stagger ×${STAGGERED_DAMAGE_MULTIPLIER}]` : '';
    const damageCalc = `${base}${guardStr}${staggerStr} = ${fmtNum(result.damage)}`;
    const line = `${heroName}: ${command} ${damageCalc}`;

    const addLine = (str, color) => {
      const y = this.contentHeight;
      const text = this.scene.add
        .text(0, y, str, { fontSize: FONT_SIZE_DEBUG_UI, fontFamily: GAME_FONT, color })
        .setOrigin(0, 0);
      this.container.add(text);
      this.entries.push({ text, y });
      this.contentHeight += this.lineHeight;
    };
    addLine(line, '#b0b0b0');

    while (this.entries.length > this.maxLines) {
      const old = this.entries.shift();
      old.text.destroy();
    }
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].text.y = i * this.lineHeight;
      this.entries[i].y = i * this.lineHeight;
    }
    this.contentHeight = this.entries.length * this.lineHeight;

    // Always scroll to bottom (newest entry) when there is a new update
    this.scroll = 0;
    this._updateScroll();
  }

  _updateScroll() {
    this.container.y =
      this.contentTop + this.contentHeightVal - this.contentHeight + this.scroll;
  }
}
