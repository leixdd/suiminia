/**
 * HeroUI: single entity grouping Hero name, HP bar, and Charge/ATB bar.
 * Created at card center (x, y); all elements are positioned relative to that.
 * Call sync() each frame (or when hero data changes) to update visuals.
 */
import {
  CARD_HEIGHT,
  MAX_CHARGE,
  HERO_BAR_WIDTH,
} from '../config/constants.js';

/** Lerp factor for ATB bar fill animation */
const ATB_FILL_LERP = 0.08;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class HeroUI {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - World x (card center)
   * @param {number} y - World y (card center)
   * @param {import('./Hero.js').Hero} hero - Hero data (name, HP, charge)
   */
  constructor(scene, x, y, hero) {
    this.scene = scene;
    this.hero = hero;

    const labelY = -CARD_HEIGHT / 2 - 25;
    const hpBarY = CARD_HEIGHT / 2 + 10;
    const hpRowHeight = 26;
    const atbBarY = hpBarY + hpRowHeight;

    const barWidth = HERO_BAR_WIDTH;
    const barHeight = 12;
    const padding = 6;
    const barRightX = 0;

    this.container = scene.add.container(x, y);

    // --- Name (above card) ---
    this.nameText = scene.add
      .text(0, labelY, hero.name, {
        fontSize: 14,
        color: '#eee',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.nameText);

    // --- HP bar ---
    this.hpLabel = scene.add
      .text(barRightX - barWidth - padding, hpBarY, 'HP', { fontSize: 11, color: '#b0b0b0' })
      .setOrigin(1, 0.5);
    this.hpBg = scene.add
      .rectangle(barRightX, hpBarY, barWidth, barHeight, 0x333333, 0.9)
      .setOrigin(1, 0.5);
    this.hpFill = scene.add
      .rectangle(barRightX, hpBarY, barWidth * (hero.currentHp / hero.maxHp), barHeight, 0x2ecc71, 1)
      .setOrigin(1, 0.5);
    this.hpValueText = scene.add
      .text(barRightX, hpBarY - barHeight / 2 - 2, `${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`, {
        fontSize: 11,
        color: '#e0e0e0',
      })
      .setOrigin(1, 1);

    this.container.add([this.hpLabel, this.hpBg, this.hpFill, this.hpValueText]);
    this._hpBarWidth = barWidth;
    this._hpBarHeight = barHeight;

    // --- ATB / Charge bar ---
    const atbValueOffsetY = barHeight / 2 + 10;
    this.atbLabel = scene.add
      .text(barRightX - barWidth - padding, atbBarY, 'ATB', { fontSize: 11, color: '#b0b0b0' })
      .setOrigin(1, 0.5);
    this.atbBg = scene.add
      .rectangle(barRightX, atbBarY, barWidth, barHeight, 0x333333, 0.9)
      .setOrigin(1, 0.5);
    this.atbFill = scene.add
      .rectangle(barRightX, atbBarY, barWidth * hero.chargeProgress(), barHeight, 0x3498db, 1)
      .setOrigin(1, 0.5);
    this.atbValueText = scene.add
      .text(barRightX, atbBarY + atbValueOffsetY, `0% (0/${MAX_CHARGE})`, {
        fontSize: 11,
        color: '#e0e0e0',
      })
      .setOrigin(1, 0);

    this.container.add([this.atbLabel, this.atbBg, this.atbFill, this.atbValueText]);
    this._atbBarWidth = barWidth;
    this._atbBarHeight = barHeight;
    this._displayCharge = 0;
    this._previousCharge = -1;
  }

  /**
   * Update all UI from current hero state. Call every frame or when hero changes.
   */
  sync() {
    const hero = this.hero;

    this.nameText.setText(hero.name);

    const hpRatio = hero.currentHp / hero.maxHp;
    this.hpFill.width = this._hpBarWidth * hpRatio;
    this.hpFill.height = this._hpBarHeight;
    this.hpFill.setOrigin(1, 0.5);
    this.hpFill.visible = hero.alive;
    this.hpBg.visible = hero.alive;
    this.hpLabel.setVisible(hero.alive);
    this.hpValueText
      .setText(`${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`)
      .setVisible(hero.alive);

    const charge = hero.charge;
    if ((this._previousCharge === 0 || this._previousCharge === -1) && charge > 0) {
      this._displayCharge = 0;
    }
    this._previousCharge = charge;
    if (charge <= 0) {
      this._displayCharge += (0 - this._displayCharge) * ATB_FILL_LERP;
      if (this._displayCharge < 0.5) this._displayCharge = 0;
    } else {
      this._displayCharge += (charge - this._displayCharge) * ATB_FILL_LERP;
      this._displayCharge = Math.min(this._displayCharge, charge);
    }
    const displayProgress = this._displayCharge / MAX_CHARGE;
    this.atbFill.width = this._atbBarWidth * displayProgress;
    this.atbFill.height = this._atbBarHeight;
    this.atbFill.setOrigin(1, 0.5);
    this.atbFill.visible = hero.alive;
    this.atbBg.visible = hero.alive;
    this.atbLabel.setVisible(hero.alive);
    const chargeRaw = Math.min(MAX_CHARGE, Math.round(charge));
    const pct = Math.round((charge / MAX_CHARGE) * 100);
    this.atbValueText
      .setText(`${pct}% (${chargeRaw}/${MAX_CHARGE})`)
      .setVisible(hero.alive);
  }

  /** Set visibility of the entire hero UI container */
  setVisible(visible) {
    this.container.setVisible(visible);
  }

  /** Destroy the container and all children */
  destroy() {
    this.container.destroy();
  }
}
