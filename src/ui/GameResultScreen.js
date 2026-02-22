/**
 * GameResultScreen: shows battle result (win/lose/draw) and per-hero stats
 * for both teams side by side (times attacked, damage dealt, damage received).
 * Palette matches SwitchHeroWindow: overlay, panel 0x1e2a38 / 0x3498db, row 0x0d1117 / 0x3a3a5c.
 */
import { GAME_WIDTH, GAME_HEIGHT, GAME_FONT } from '../config/constants.js';

const DEPTH = 560;
const PANEL_H = 320;
const PANEL_PAD = 40;
const TITLE_Y_OFFSET = 22;
const ROW_H = 36;
const ROW_SPACING = 42;
const STATS_LINE_HEIGHT = 22;
const FONT_SIZE_TITLE = 22;
const FONT_SIZE_HEADER = 12;
const FONT_SIZE_ROW = 10;
const FONT_SIZE_STATS = 10;

/** Row width so both columns fit with padding (each half minus padding). */
function getRowWidth() {
  return Math.max(180, (GAME_WIDTH / 2) - 2 * PANEL_PAD);
}

/** Left column center X (first quarter of panel). */
function getLeftColCenter() {
  return GAME_WIDTH / 4;
}

/** Right column center X (third quarter of panel). */
function getRightColCenter() {
  return (3 * GAME_WIDTH) / 4;
}

// Same as SwitchHeroWindow
const OVERLAY_COLOR = 0x000000;
const OVERLAY_ALPHA = 0.6;
const PANEL_FILL = 0x1e2a38;
const PANEL_ALPHA = 0.98;
const PANEL_STROKE = 0x3498db;
const ROW_FILL = 0x0d1117;
const ROW_ALPHA = 0.95;
const ROW_STROKE = 0x3a3a5c;
const TITLE_COLOR = '#f1c40f';
const HEADER_COLOR = '#3498db';
const NAME_COLOR = '#e0e0e0';
const STATS_COLOR = '#b0b0b0';

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class GameResultScreen {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(DEPTH).setVisible(false);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.overlay = scene.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, OVERLAY_COLOR, OVERLAY_ALPHA)
      .setVisible(false);
    this.panel = scene.add
      .rectangle(cx, cy, GAME_WIDTH, PANEL_H, PANEL_FILL, PANEL_ALPHA)
      .setStrokeStyle(3, PANEL_STROKE)
      .setVisible(false);
    this.container.add([this.overlay, this.panel]);

    this._titleText = null;
    this._playerHeader = null;
    this._enemyHeader = null;
    this._playerRows = [];
    this._enemyRows = [];
    this._backBtn = null;
    this._backZone = null;
  }

  /**
   * @param {'player' | 'enemy' | null} winner
   * @param {import('../entities/Hero.js').Hero[]} playerTeam
   * @param {import('../entities/Hero.js').Hero[]} enemyTeam
   */
  show(winner, playerTeam, enemyTeam) {
    this._clear();
    this.overlay.setVisible(true);
    this.panel.setVisible(true);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelTop = cy - PANEL_H / 2;
    const listLeftX = getLeftColCenter();
    const listRightX = getRightColCenter();
    const rowW = getRowWidth();
    const rowStartY = panelTop + 50;

    const msg =
      winner === 'player' ? 'You win!' : winner === 'enemy' ? 'Enemy wins!' : 'Draw!';
    this._titleText = this.scene.add
      .text(cx, panelTop + TITLE_Y_OFFSET, msg, {
        fontSize: FONT_SIZE_TITLE,
        fontFamily: GAME_FONT,
        color: TITLE_COLOR,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 2);
    this.container.add(this._titleText);

    this._playerHeader = this.scene.add
      .text(listLeftX, rowStartY - ROW_SPACING, 'Your team', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: HEADER_COLOR,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 2);
    this.container.add(this._playerHeader);

    playerTeam.forEach((hero, i) => {
      const y = rowStartY + i * ROW_SPACING + ROW_H / 2;
      const bg = this.scene.add
        .rectangle(listLeftX, y, rowW, ROW_H, ROW_FILL, ROW_ALPHA)
        .setStrokeStyle(1, ROW_STROKE)
        .setDepth(DEPTH + 2);
      const nameText = this.scene.add
        .text(listLeftX - rowW / 2 + 14, y - ROW_H / 2 + 6, hero.name, {
          fontSize: FONT_SIZE_ROW,
          fontFamily: GAME_FONT,
          color: NAME_COLOR,
        })
        .setOrigin(0, 0)
        .setDepth(DEPTH + 3);
      const statsText = this.scene.add
        .text(
          listLeftX - rowW / 2 + 14,
          y - ROW_H / 2 + 6 + STATS_LINE_HEIGHT,
          `Turns: ${hero.timesAttacked}  Dealt: ${fmtNum(hero.damageDealt)}  Taken: ${fmtNum(hero.damageReceived)}`,
          { fontSize: FONT_SIZE_STATS, fontFamily: GAME_FONT, color: STATS_COLOR }
        )
        .setOrigin(0, 0)
        .setDepth(DEPTH + 3);
      this.container.add([bg, nameText, statsText]);
      this._playerRows.push({ bg, nameText, statsText });
    });

    this._enemyHeader = this.scene.add
      .text(listRightX, rowStartY - ROW_SPACING, 'Enemy team', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: HEADER_COLOR,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 2);
    this.container.add(this._enemyHeader);

    enemyTeam.forEach((hero, i) => {
      const y = rowStartY + i * ROW_SPACING + ROW_H / 2;
      const bg = this.scene.add
        .rectangle(listRightX, y, rowW, ROW_H, ROW_FILL, ROW_ALPHA)
        .setStrokeStyle(1, ROW_STROKE)
        .setDepth(DEPTH + 2);
      const nameText = this.scene.add
        .text(listRightX - rowW / 2 + 14, y - ROW_H / 2 + 6, hero.name, {
          fontSize: FONT_SIZE_ROW,
          fontFamily: GAME_FONT,
          color: NAME_COLOR,
        })
        .setOrigin(0, 0)
        .setDepth(DEPTH + 3);
      const statsText = this.scene.add
        .text(
          listRightX - rowW / 2 + 14,
          y - ROW_H / 2 + 6 + STATS_LINE_HEIGHT,
          `Turn: ${hero.timesAttacked}  Dealt: ${fmtNum(hero.damageDealt)}  Taken: ${fmtNum(hero.damageReceived)}`,
          { fontSize: FONT_SIZE_STATS, fontFamily: GAME_FONT, color: STATS_COLOR }
        )
        .setOrigin(0, 0)
        .setDepth(DEPTH + 3);
      this.container.add([bg, nameText, statsText]);
      this._enemyRows.push({ bg, nameText, statsText });
    });

    const backY = panelTop + PANEL_H - 44;
    this._backZone = this.scene.add
      .rectangle(cx, backY, 140, 32, ROW_FILL, ROW_ALPHA)
      .setStrokeStyle(2, PANEL_STROKE)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);
    this._backZone.on('pointerdown', () => {
      this.hide();
      this.scene.scene.start('Lobby');
    });
    this._backZone.on('pointerover', () => this._backZone.setStrokeStyle(2, 0xf1c40f));
    this._backZone.on('pointerout', () => this._backZone.setStrokeStyle(2, PANEL_STROKE));
    this.container.add(this._backZone);

    this._backBtn = this.scene.add
      .text(cx, backY, 'Back to Lobby', {
        fontSize: FONT_SIZE_ROW,
        fontFamily: GAME_FONT,
        color: TITLE_COLOR,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH + 3);
    this.container.add(this._backBtn);

    this.container.setVisible(true);
  }

  _clear() {
    if (this._titleText) this._titleText.destroy();
    if (this._playerHeader) this._playerHeader.destroy();
    if (this._enemyHeader) this._enemyHeader.destroy();
    this._playerRows.forEach((r) => {
      r.bg.destroy();
      r.nameText.destroy();
      r.statsText.destroy();
    });
    this._enemyRows.forEach((r) => {
      r.bg.destroy();
      r.nameText.destroy();
      r.statsText.destroy();
    });
    this._titleText = null;
    this._playerHeader = this._enemyHeader = null;
    this._playerRows = [];
    this._enemyRows = [];
    if (this._backZone) {
      this._backZone.destroy();
      this._backZone = null;
    }
    if (this._backBtn) {
      this._backBtn.destroy();
      this._backBtn = null;
    }
  }

  hide() {
    this._clear();
    this.container.setVisible(false);
  }
}
