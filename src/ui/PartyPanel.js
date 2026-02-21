/**
 * PartyPanel: top bar showing player and enemy team as small squares with HP bars.
 * Boxes animate in from top with ease-in, one by one.
 * Player slots are clickable when switch-hero is pending.
 */
import { GAME_WIDTH, TEAM_SIZE, GAME_FONT } from '../config/constants.js';

const BOX_SIZE = 52;
const BOX_GAP = 10;
const PANEL_Y = 38;
const DEPTH = 350;
const PAD = 3;
const HP_BAR_H = 6;
const DROP_OFFSET = 48;
const STAGGER_MS = 70;
const TWEEN_DURATION = 280;
const EASE = 'Quad.In';
const TOOLTIP_DEPTH = DEPTH + 15;
const TOOLTIP_PADDING = 8;
const TOOLTIP_LINE_HEIGHT = 14;
const TOOLTIP_FONT_SIZE = 8;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function hpBarColor(ratio) {
  if (ratio > 0.5) return 0x2ecc71;
  if (ratio > 0.25) return 0xf1c40f;
  return 0xe74c3c;
}

export class PartyPanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   getPlayerTeam: () => import('../entities/Hero.js').Hero[],
   *   getEnemyTeam: () => import('../entities/Hero.js').Hero[],
   *   getPlayerActive: () => import('../entities/Hero.js').Hero,
   *   getEnemyActive: () => import('../entities/Hero.js').Hero,
   *   isPendingPlayerSwitch: () => boolean,
   *   onPlayerSlotClick: (index: number) => void,
   * }} options
   */
  constructor(scene, options) {
    this.scene = scene;
    this.getPlayerTeam = options.getPlayerTeam;
    this.getEnemyTeam = options.getEnemyTeam;
    this.getPlayerActive = options.getPlayerActive;
    this.getEnemyActive = options.getEnemyActive;
    this.isPendingPlayerSwitch = options.isPendingPlayerSwitch;
    this.onPlayerSlotClick = options.onPlayerSlotClick;
    this._playInDone = false;
    this._tooltipSlot = null;

    const playerStartX = 60 + BOX_SIZE / 2;
    const enemyStartX =
      GAME_WIDTH - 60 - (TEAM_SIZE * BOX_SIZE + (TEAM_SIZE - 1) * BOX_GAP) + BOX_SIZE / 2;

    this.playerSlots = [];
    this.enemySlots = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      this.playerSlots.push(
        this._createSlot(playerStartX + i * (BOX_SIZE + BOX_GAP), PANEL_Y, options.getPlayerTeam()[i], i, true)
      );
      this.enemySlots.push(
        this._createSlot(enemyStartX + i * (BOX_SIZE + BOX_GAP), PANEL_Y, options.getEnemyTeam()[i], i, false)
      );
    }

    this._createTooltip();
  }

  _createTooltip() {
    const scene = this.scene;
    this.tooltipContainer = scene.add.container(0, 0).setDepth(TOOLTIP_DEPTH).setVisible(false);
    this.tooltipBg = scene.add
      .rectangle(0, 0, 120, 70, 0x1a1a2e, 0.98)
      .setStrokeStyle(1, 0x3498db)
      .setOrigin(0.5, 0);
    this.tooltipName = scene.add
      .text(0, TOOLTIP_PADDING, '', { fontSize: TOOLTIP_FONT_SIZE, fontFamily: GAME_FONT, color: '#f1c40f' })
      .setOrigin(0.5, 0);
    this.tooltipAtk = scene.add
      .text(0, TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT, '', { fontSize: TOOLTIP_FONT_SIZE, fontFamily: GAME_FONT, color: '#b0b0b0' })
      .setOrigin(0.5, 0);
    this.tooltipDef = scene.add
      .text(0, TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT * 2, '', { fontSize: TOOLTIP_FONT_SIZE, fontFamily: GAME_FONT, color: '#b0b0b0' })
      .setOrigin(0.5, 0);
    this.tooltipSpd = scene.add
      .text(0, TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT * 3, '', { fontSize: TOOLTIP_FONT_SIZE, fontFamily: GAME_FONT, color: '#b0b0b0' })
      .setOrigin(0.5, 0);
    this.tooltipHp = scene.add
      .text(0, TOOLTIP_PADDING + TOOLTIP_LINE_HEIGHT * 4, '', { fontSize: TOOLTIP_FONT_SIZE, fontFamily: GAME_FONT, color: '#b0b0b0' })
      .setOrigin(0.5, 0);
    this.tooltipContainer.add([
      this.tooltipBg,
      this.tooltipName,
      this.tooltipAtk,
      this.tooltipDef,
      this.tooltipSpd,
      this.tooltipHp,
    ]);
  }

  _showTooltip(slot) {
    if (this._tooltipSlot === slot) {
      this.tooltipContainer.setVisible(false);
      this._tooltipSlot = null;
      return;
    }
    this._tooltipSlot = slot;
    const hero = slot.hero;
    const x = slot.container.x;
    const y = slot.container.y + BOX_SIZE / 2 + 6;
    this.tooltipContainer.setPosition(x, y);
    this.tooltipName.setText(hero.name);
    this.tooltipAtk.setText(`ATK  ${hero.atk}`);
    this.tooltipDef.setText(`DEF  ${hero.def}`);
    this.tooltipSpd.setText(`SPD  ${hero.spd}`);
    this.tooltipHp.setText(`HP   ${fmtNum(hero.currentHp)} / ${fmtNum(hero.maxHp)}`);
    this.tooltipContainer.setVisible(true);
  }

  _createSlot(centerX, centerY, hero, index, isPlayer) {
    const scene = this.scene;
    const hpBarW = BOX_SIZE - PAD * 2;
    const hpBarY = BOX_SIZE / 2 - PAD - HP_BAR_H / 2;

    const container = scene.add.container(centerX, centerY - DROP_OFFSET);
    container.setDepth(DEPTH);
    container.alpha = 0;

    const bg = scene.add
      .rectangle(0, 0, BOX_SIZE, BOX_SIZE, 0x1a1a2e, 0.95)
      .setStrokeStyle(1, 0x3a3a5c)
      .setOrigin(0.5, 0.5);
    const hpBarBg = scene.add
      .rectangle(0, hpBarY, hpBarW, HP_BAR_H, 0x333333, 1)
      .setOrigin(0.5, 0.5);
    const hpBarFill = scene.add
      .rectangle(-hpBarW / 2 + 1, hpBarY, hpBarW * (hero.currentHp / hero.maxHp), HP_BAR_H - 2, 0x2ecc71, 1)
      .setOrigin(0, 0.5);
    const nameText = scene.add
      .text(0, -BOX_SIZE / 2 + 8, hero.name, { fontSize: 6, fontFamily: GAME_FONT, color: '#ccc' })
      .setOrigin(0.5, 0);
    const zone = scene.add
      .rectangle(0, 0, BOX_SIZE, BOX_SIZE, 0x000000, 0)
      .setInteractive({ useHandCursor: isPlayer });

    container.add([bg, hpBarBg, hpBarFill, nameText, zone]);

    return {
      container,
      bg,
      hpBarBg,
      hpBarFill,
      nameText,
      zone,
      hero,
      index,
      isPlayer,
      hpBarW,
      centerX,
      centerY,
    };
  }

  /**
   * Play top-down ease-in animation for all boxes, one by one.
   * Call once when the battle UI is ready (e.g. from scene create).
   */
  playIn() {
    if (this._playInDone) return;
    this._playInDone = true;

    const allSlots = [...this.playerSlots, ...this.enemySlots];
    allSlots.forEach((slot, i) => {
      this.scene.tweens.add({
        targets: slot.container,
        y: slot.centerY,
        alpha: 1,
        duration: TWEEN_DURATION,
        delay: i * STAGGER_MS,
        ease: EASE,
      });
    });
  }

  sync() {
    const pActive = this.getPlayerActive();
    const eActive = this.getEnemyActive();
    const pendingSwitch = this.isPendingPlayerSwitch();

    for (const slot of this.playerSlots) {
      slot.nameText.setText(slot.hero.name);
      slot.nameText.setColor(slot.hero.alive ? '#eee' : '#666');
      const ratio = slot.hero.maxHp > 0 ? slot.hero.currentHp / slot.hero.maxHp : 0;
      slot.hpBarFill.width = Math.max(0, (slot.hpBarW - 2) * ratio);
      slot.hpBarFill.setFillStyle(hpBarColor(ratio), 1);
      slot.hpBarFill.visible = slot.hero.alive;
      slot.hpBarBg.visible = slot.hero.alive;
      const isActive = slot.hero === pActive;
      slot.bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0x3498db : 0x3a3a5c);
      slot.zone.off('pointerdown');
      slot.zone.on('pointerdown', () => {
        this._showTooltip(slot);
        if (pendingSwitch && slot.hero.alive) this.onPlayerSlotClick(slot.index);
      });
    }

    for (const slot of this.enemySlots) {
      slot.nameText.setText(slot.hero.name);
      slot.nameText.setColor(slot.hero.alive ? '#eee' : '#666');
      const ratio = slot.hero.maxHp > 0 ? slot.hero.currentHp / slot.hero.maxHp : 0;
      slot.hpBarFill.width = Math.max(0, (slot.hpBarW - 2) * ratio);
      slot.hpBarFill.setFillStyle(hpBarColor(ratio), 1);
      slot.hpBarFill.visible = slot.hero.alive;
      slot.hpBarBg.visible = slot.hero.alive;
      const isActive = slot.hero === eActive;
      slot.bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0xe74c3c : 0x3a3a5c);
      slot.zone.off('pointerdown');
      slot.zone.on('pointerdown', () => this._showTooltip(slot));
    }

    if (this._tooltipSlot && this.tooltipContainer.visible) {
      const hero = this._tooltipSlot.hero;
      this.tooltipHp.setText(`HP   ${fmtNum(hero.currentHp)} / ${fmtNum(hero.maxHp)}`);
    }
  }
}
