/**
 * SwitchHeroWindow: modal "Choose next hero" UI with keyboard (1/2/3, arrows+Enter) and mouse.
 * Used when the player must or wants to switch the active hero (after KO or voluntary switch).
 */
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TEAM_SIZE,
  GAME_FONT,
} from '../config/constants.js';

const DEPTH = 400;
const PANEL_W = 320;
const PANEL_H = 200;
const ROW_W = 260;
const ROW_H = 28;
const ROW_SPACING = 36;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class SwitchHeroWindow {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ getTeam: () => import('../entities/Hero.js').Hero[], onSelect: (index: number) => void }} options
   */
  constructor(scene, { getTeam, onSelect }) {
    this.scene = scene;
    this.getTeam = getTeam;
    this.onSelect = onSelect;
    this.selectedIndex = 0;
    this._keyDownHandler = this._onKeyDown.bind(this);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelX = cx;
    const panelY = cy;
    const rowStartY = panelY - PANEL_H / 2 + 44;

    this.overlay = scene.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setVisible(false)
      .setDepth(DEPTH);

    this.panel = scene.add
      .rectangle(panelX, panelY, PANEL_W, PANEL_H, 0x1e2a38, 0.98)
      .setStrokeStyle(3, 0x3498db)
      .setVisible(false)
      .setDepth(DEPTH + 1);

    this.title = scene.add
      .text(panelX, panelY - PANEL_H / 2 + 22, 'Choose next hero!', {
        fontSize: 12,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTH + 2);

    this.optionRows = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = rowStartY + i * ROW_SPACING + ROW_H / 2;
      this.optionRows.push(this._createRow(panelX, y, i));
    }

    this.hint = scene.add
      .text(panelX, panelY + PANEL_H / 2 - 22, '1 / 2 / 3 or click  ·  \u2191\u2193 + Enter', {
        fontSize: 8,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTH + 2);
  }

  _createRow(centerX, y, index) {
    const scene = this.scene;
    const bg = scene.add
      .rectangle(centerX, y, ROW_W, ROW_H, 0x0d1117, 0.95)
      .setStrokeStyle(1, 0x3a3a5c)
      .setVisible(false)
      .setDepth(DEPTH + 2);
    const keyText = scene.add
      .text(centerX - ROW_W / 2 + 14, y, `[${index + 1}]`, { fontSize: 10, fontFamily: GAME_FONT, color: '#8b949e' })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const nameText = scene.add
      .text(centerX - ROW_W / 2 + 50, y, '', { fontSize: 10, fontFamily: GAME_FONT, color: '#e0e0e0' })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const hpText = scene.add
      .text(centerX + ROW_W / 2 - 14, y, '', { fontSize: 10, fontFamily: GAME_FONT, color: '#aaa' })
      .setOrigin(1, 0.5)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const zone = scene.add
      .rectangle(centerX, y, ROW_W, ROW_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(DEPTH + 4);
    return { bg, keyText, nameText, hpText, zone, index };
  }

  show() {
    const team = this.getTeam();
    const aliveIndices = team.map((h, i) => i).filter((i) => team[i].alive);
    this.selectedIndex = aliveIndices.length > 0 ? aliveIndices[0] : 0;

    this.overlay.setVisible(true);
    this.panel.setVisible(true);
    this.title.setVisible(true);
    this.hint.setVisible(true);

    for (const row of this.optionRows) {
      row.bg.setVisible(true);
      row.keyText.setVisible(true);
      row.nameText.setVisible(true);
      row.hpText.setVisible(true);
      row.zone.setVisible(true);
      row.zone.removeAllListeners();
      row.zone.on('pointerdown', () => this._onRowClick(row.index));
      row.zone.on('pointerover', () => { this.selectedIndex = row.index; });
    }

    this.scene.input.keyboard.on('keydown', this._keyDownHandler);
  }

  hide() {
    this.overlay.setVisible(false);
    this.panel.setVisible(false);
    this.title.setVisible(false);
    this.hint.setVisible(false);
    for (const row of this.optionRows) {
      row.bg.setVisible(false);
      row.keyText.setVisible(false);
      row.nameText.setVisible(false);
      row.hpText.setVisible(false);
      row.zone.setVisible(false);
    }
    this.scene.input.keyboard.off('keydown', this._keyDownHandler);
  }

  sync() {
    const team = this.getTeam();
    for (const row of this.optionRows) {
      const hero = team[row.index];
      row.nameText.setText(hero.name);
      row.hpText.setText(`${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`);
      row.nameText.setColor(hero.alive ? '#e0e0e0' : '#666');
      row.hpText.setColor(hero.alive ? '#aaa' : '#666');
      row.keyText.setColor(hero.alive ? '#8b949e' : '#555');
      const selected = this.selectedIndex === row.index;
      row.bg.setStrokeStyle(selected ? 2 : 1, hero.alive && selected ? 0x3498db : 0x3a3a5c);
    }
  }

  _onRowClick(index) {
    const team = this.getTeam();
    if (!team[index].alive) return;
    this._confirm(index);
  }

  _onKeyDown(event) {
    const team = this.getTeam();
    const aliveIndices = team.map((h, i) => i).filter((i) => team[i].alive);
    if (aliveIndices.length === 0) return;

    const key = event.keyCode;
    if (key >= 49 && key <= 51) {
      const index = key - 49;
      if (team[index].alive) {
        this._confirm(index);
        return;
      }
    }
    if (key === 13) {
      if (team[this.selectedIndex].alive) {
        this._confirm(this.selectedIndex);
      }
      return;
    }
    if (key === 38) {
      const idx = aliveIndices.indexOf(this.selectedIndex);
      const prev = idx <= 0 ? aliveIndices.length - 1 : idx - 1;
      this.selectedIndex = aliveIndices[prev];
      return;
    }
    if (key === 40) {
      const idx = aliveIndices.indexOf(this.selectedIndex);
      const next = idx < 0 || idx >= aliveIndices.length - 1 ? 0 : idx + 1;
      this.selectedIndex = aliveIndices[next];
      return;
    }
  }

  _confirm(index) {
    this.onSelect(index);
    this.hide();
  }
}
