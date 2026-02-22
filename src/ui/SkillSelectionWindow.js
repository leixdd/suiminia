/**
 * SkillSelectionWindow: modal "Choose a skill" UI. Shows only the current hero's skills (max 4).
 * on select, invokes onSelect(skillId) and closes (triggering the attack with that skill).
 */
import { GAME_WIDTH, GAME_HEIGHT, GAME_FONT } from '../config/constants.js';
import { getSkillById, MAX_SKILLS_PER_HERO } from '../data/skills.js';

const DEPTH = 400;
const PANEL_W = 420;
const PANEL_H = 280;
const ROW_W = 360;
const ROW_H = 32;
const ROW_SPACING = 38;
const FONT_SIZE_ROW = 10;
const FONT_SIZE_DESC = 8;
const FONT_SIZE_HEADER = 12;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class SkillSelectionWindow {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ onSelect: (skillId: string) => void, onHide?: () => void }} options
   */
  constructor(scene, { onSelect, onHide }) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.onHide = onHide ?? (() => {});
    this.selectedIndex = 0;
    this._keyDownHandler = this._onKeyDown.bind(this);
    /** Capture-phase listener so ESC is consumed before Phaser/game can pause (same as SwitchHeroWindow). */
    this._captureKeyDown = this._onCaptureKeyDown.bind(this);
    /** @type {import('../data/skills.js').Skill[]} */
    this.skills = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const rowStartY = cy - PANEL_H / 2 + 50;

    this.overlay = scene.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setVisible(false)
      .setDepth(DEPTH);

    this.panel = scene.add
      .rectangle(cx, cy, PANEL_W, PANEL_H, 0x1e2a38, 0.98)
      .setStrokeStyle(3, 0x3498db)
      .setVisible(false)
      .setDepth(DEPTH + 1);

    this.title = scene.add
      .text(cx, cy - PANEL_H / 2 + 22, 'Choose skill', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setDepth(DEPTH + 2);

    this.optionRows = [];
    for (let i = 0; i < MAX_SKILLS_PER_HERO; i++) {
      const y = rowStartY + i * ROW_SPACING + ROW_H / 2;
      this.optionRows.push(this._createRow(cx, y, i));
    }

    this.hint = scene.add
      .text(cx, cy + PANEL_H / 2 - 22, '1–4 or click  ·  \u2191\u2193 scroll, Enter  ·  Esc cancel', {
        fontSize: 8,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0)
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
      .text(centerX - ROW_W / 2 + 14, y - 2, `[${index + 1}]`, {
        fontSize: FONT_SIZE_ROW - 1,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const nameText = scene.add
      .text(centerX - ROW_W / 2 + 44, y - 2, '', {
        fontSize: FONT_SIZE_ROW,
        fontFamily: GAME_FONT,
        color: '#e0e0e0',
      })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const formulaText = scene.add
      .text(centerX - ROW_W / 2 + 44, y + 10, '', {
        fontSize: FONT_SIZE_DESC,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0, 0)
      .setVisible(false)
      .setDepth(DEPTH + 3);
    const zone = scene.add
      .rectangle(centerX, y, ROW_W, ROW_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(DEPTH + 4);
    return { bg, keyText, nameText, formulaText, zone, index };
  }

  /**
   * Show the window with the given hero skill IDs (max 4). Only these skills are listed.
   * @param {string[]} skillIds - Skill ids from hero config (will be sliced to MAX_SKILLS_PER_HERO)
   */
  show(skillIds = []) {
    const ids = skillIds.slice(0, MAX_SKILLS_PER_HERO);
    this.skills = ids.map((id) => getSkillById(id)).filter(Boolean);
    this.selectedIndex = 0;

    this.overlay.setVisible(true);
    this.panel.setVisible(true);
    this.title.setVisible(true);
    this.hint.setVisible(true);

    for (let i = 0; i < this.optionRows.length; i++) {
      const row = this.optionRows[i];
      const skill = this.skills[i];
      const visible = !!skill;
      row.bg.setVisible(visible);
      row.keyText.setVisible(visible);
      row.nameText.setVisible(visible);
      row.formulaText.setVisible(visible);
      row.zone.setVisible(visible);
      if (skill) {
        row.nameText.setText(skill.name);
        const hitsStr = (skill.hits ?? 1) > 1 ? ` · ${skill.hits} hits` : '';
        row.formulaText.setText(`+${skill.skillDamage} dmg, +${fmtNum((skill.damageMultiplier ?? 0) * 100)}% ATK${hitsStr}`);
        row.zone.removeAllListeners();
        row.zone.on('pointerdown', () => this._confirm(row.index));
        row.zone.on('pointerover', () => { this.selectedIndex = row.index; });
      }
    }

    this.scene.input.keyboard.on('keydown', this._keyDownHandler);
    window.addEventListener('keydown', this._captureKeyDown, true);
    this.sync();
  }

  _onCaptureKeyDown(event) {
    if (event.keyCode !== 27) return;
    event.preventDefault();
    event.stopPropagation();
    this.hide();
  }

  hide() {
    this.onHide();
    this.overlay.setVisible(false);
    this.panel.setVisible(false);
    this.title.setVisible(false);
    this.hint.setVisible(false);
    for (const row of this.optionRows) {
      row.bg.setVisible(false);
      row.keyText.setVisible(false);
      row.nameText.setVisible(false);
      row.formulaText.setVisible(false);
      row.zone.setVisible(false);
    }
    this.scene.input.keyboard.off('keydown', this._keyDownHandler);
    window.removeEventListener('keydown', this._captureKeyDown, true);
  }

  sync() {
    for (const row of this.optionRows) {
      const selected = this.selectedIndex === row.index;
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? 0x3498db : 0x3a3a5c);
    }
  }

  _onKeyDown(event) {
    const key = event.keyCode;
    const handled = key >= 49 && key <= 52 || key === 13 || key === 27 || key === 38 || key === 40;
    if (!handled) return;

    event.preventDefault();
    event.stopPropagation();
    if (key >= 49 && key <= 52) {
      const index = key - 49;
      if (index < this.skills.length) {
        this._confirm(index);
      }
      return;
    }
    if (key === 13) {
      this._confirm(this.selectedIndex);
      return;
    }
    if (key === 27) {
      this.hide();
      return;
    }
    if (key === 38) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.sync();
      return;
    }
    if (key === 40) {
      this.selectedIndex = Math.min(this.skills.length - 1, this.selectedIndex + 1);
      this.sync();
      return;
    }
  }

  _confirm(index) {
    const skill = this.skills[index];
    if (skill) {
      this.onSelect(skill.id);
    }
    this.hide();
  }
}
