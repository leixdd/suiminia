/**
 * HeroUI: single entity grouping Hero name, HP bar, and Charge/ATB bar.
 * Created at card center (x, y); all elements are positioned relative to that.
 * Call sync() each frame (or when hero data changes) to update visuals.
 */
import {
  CARD_HEIGHT,
  HERO_UI_FONT,
  HERO_UI_FONT_SIZE_BAR,
  HERO_UI_FONT_SIZE_NAME,
  MAX_CHARGE,
  MAX_STAGGER,
  HERO_BAR_WIDTH,
} from '../config/constants.js';

/** Lerp factor for ATB bar fill animation */
const ATB_FILL_LERP = 0.08;
/** Lerp factor for HP bar fill (decrease/increase animation) */
const HP_FILL_LERP = 0.12;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** HP bar colors: green > 51%, yellow 50–51%, orange at 25%, red at 15% (with lerp between) */
const HP_COLOR_GREEN = 0x2ecc71;
const HP_COLOR_YELLOW = 0xf1c40f;
const HP_COLOR_ORANGE = 0xe67e22;
const HP_COLOR_RED = 0xe74c3c;

function lerpColor(t, colorA, colorB) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(((colorA >> 16) & 0xff) + (((colorB >> 16) & 0xff) - ((colorA >> 16) & 0xff)) * t);
  const g = Math.round(((colorA >> 8) & 0xff) + (((colorB >> 8) & 0xff) - ((colorA >> 8) & 0xff)) * t);
  const b = Math.round((colorA & 0xff) + ((colorB & 0xff) - (colorA & 0xff)) * t);
  return (r << 16) | (g << 8) | b;
}

function getHpBarColor(ratio) {
  if (ratio > 0.51) return HP_COLOR_GREEN;
  if (ratio >= 0.5) return HP_COLOR_YELLOW;
  if (ratio >= 0.25) {
    const t = (ratio - 0.25) / 0.25;
    return lerpColor(t, HP_COLOR_ORANGE, HP_COLOR_YELLOW);
  }
  if (ratio >= 0.15) {
    const t = (ratio - 0.15) / 0.1;
    return lerpColor(t, HP_COLOR_RED, HP_COLOR_ORANGE);
  }
  return HP_COLOR_RED;
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
    const hpBarY = CARD_HEIGHT / 2 + 20;
    const hpRowHeight = 26;
    const atbBarY = hpBarY + hpRowHeight;
    const staggerBarY = atbBarY + hpRowHeight;

    const barWidth = HERO_BAR_WIDTH;
    const barHeight = 12;
    const padding = 6;
    const barLeftX = -(barWidth / 2);
    const barRightX = 0;

    this.container = scene.add.container(x, y);

    // --- Name (above card) ---
    this.nameText = scene.add
      .text(0, labelY, hero.name, {
        fontSize: HERO_UI_FONT_SIZE_NAME,
        fontFamily: HERO_UI_FONT,
        color: '#eee',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.nameText);

    // --- HP bar (fill grows left → right) ---
    this.hpLabel = scene.add
      .text(barLeftX - padding, hpBarY, 'HP', { fontSize: HERO_UI_FONT_SIZE_BAR, fontFamily: HERO_UI_FONT, color: '#b0b0b0' })
      .setOrigin(1, 0.5);
    this.hpBg = scene.add
      .rectangle(barLeftX, hpBarY, barWidth, barHeight, 0x333333, 0.9)
      .setOrigin(0, 0.5);
    this.hpFill = scene.add
      .rectangle(
        barLeftX,
        hpBarY,
        barWidth * (hero.currentHp / hero.maxHp),
        barHeight,
        getHpBarColor(hero.currentHp / hero.maxHp),
        1
      )
      .setOrigin(0, 0.5);
    this.hpValueText = scene.add
      .text(barLeftX - padding + 10, hpBarY + barHeight / 2, `${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`, {
        fontSize: HERO_UI_FONT_SIZE_BAR,
        fontFamily: HERO_UI_FONT,
        color: '#e0e0e0',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setOrigin(0, 1);

    this.container.add([this.hpLabel, this.hpBg, this.hpFill, this.hpValueText]);
    this._hpBarWidth = barWidth;
    this._hpBarHeight = barHeight;
    /** Display HP ratio 0..1, lerped for smooth decrease/increase animation */
    this._displayHpRatio = hero.currentHp / hero.maxHp;

    // --- ATB / Charge bar (fill grows left → right) ---
    const atbValueOffsetY = barHeight / 2 + 10;
    this.atbLabel = scene.add
      .text(barLeftX - padding, atbBarY, 'ATB', { fontSize: HERO_UI_FONT_SIZE_BAR, fontFamily: HERO_UI_FONT, color: '#b0b0b0' })
      .setOrigin(1, 0.5);
    this.atbBg = scene.add
      .rectangle(barLeftX, atbBarY, barWidth, barHeight, 0x333333, 0.9)
      .setOrigin(0, 0.5);
    this.atbFill = scene.add
      .rectangle(barLeftX, atbBarY, barWidth * hero.chargeProgress(), barHeight, 0x3498db, 1)
      .setOrigin(0, 0.5);
    this.atbValueText = scene.add
      .text(barLeftX + padding, atbBarY - 4, `0%`, {
        fontSize: HERO_UI_FONT_SIZE_BAR,
        fontFamily: HERO_UI_FONT,
        color: '#e0e0e0',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setOrigin(0, 0);

    this.container.add([this.atbLabel, this.atbBg, this.atbFill, this.atbValueText]);
    this._atbBarWidth = barWidth;
    this._atbBarHeight = barHeight;
    this._displayCharge = 0;
    this._previousCharge = -1;

    // --- Stagger bar (fills when hit while guarding; when full → Staggered) ---
    const staggerFillColor = 0xe67e22; // orange
    const staggerFullColor = 0xe74c3c; // red when near full / staggered
    this.staggerLabel = scene.add
      .text(barLeftX - padding, staggerBarY, 'Stagger', { fontSize: HERO_UI_FONT_SIZE_BAR, fontFamily: HERO_UI_FONT, color: '#b0b0b0' })
      .setOrigin(1, 0.5);
    this.staggerBg = scene.add
      .rectangle(barLeftX, staggerBarY, barWidth, barHeight, 0x333333, 0.9)
      .setOrigin(0, 0.5);
    this.staggerFill = scene.add
      .rectangle(barLeftX, staggerBarY, barWidth * hero.staggerProgress(), barHeight, staggerFillColor, 1)
      .setOrigin(0, 0.5);
    this.staggerValueText = scene.add
      .text(barLeftX + padding, staggerBarY - 4, '0%', {
        fontSize: HERO_UI_FONT_SIZE_BAR,
        fontFamily: HERO_UI_FONT,
        color: '#e0e0e0',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setOrigin(0, 0);
    this.staggeredBadge = scene.add
      .text(0, staggerBarY, 'STAGGERED!', {
        fontSize: 7,
        fontFamily: HERO_UI_FONT,
        color: '#e74c3c',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(hero.staggered);
    this.container.add([this.staggerLabel, this.staggerBg, this.staggerFill, this.staggerValueText, this.staggeredBadge]);
    this._staggerBarWidth = barWidth;
    this._staggerBarHeight = barHeight;
    this._displayStagger = hero.staggerProgress();
  }

  /**
   * Update all UI from current hero state. Call every frame or when hero changes.
   */
  sync() {
    const hero = this.hero;

    this.nameText.setText(hero.name);

    const targetHpRatio = hero.currentHp / hero.maxHp;
    this._displayHpRatio += (targetHpRatio - this._displayHpRatio) * HP_FILL_LERP;
    this._displayHpRatio = Math.max(0, Math.min(1, this._displayHpRatio));
    this.hpFill.setFillStyle(getHpBarColor(targetHpRatio), 1);
    this.hpFill.width = this._hpBarWidth * this._displayHpRatio;
    this.hpFill.height = this._hpBarHeight;
    this.hpFill.setOrigin(0, 0.5);
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
    const displayProgress = Math.max(0, Math.min(1, this._displayCharge / MAX_CHARGE));
    this.atbFill.width = this._atbBarWidth * displayProgress;
    this.atbFill.height = this._atbBarHeight;
    this.atbFill.setOrigin(0, 0.5);
    this.atbFill.visible = hero.alive;
    this.atbBg.visible = hero.alive;
    this.atbLabel.setVisible(hero.alive);
    const pct = Math.max(0, Math.min(100, Math.round((charge / MAX_CHARGE) * 100)));
    this.atbValueText
      .setText(`${pct}%`)
      .setVisible(hero.alive);

    // --- Stagger bar ---
    const targetStaggerProgress = hero.staggerProgress();
    this._displayStagger += (targetStaggerProgress - this._displayStagger) * ATB_FILL_LERP;
    this._displayStagger = Math.max(0, Math.min(1, this._displayStagger));
    this.staggerFill.width = this._staggerBarWidth * this._displayStagger;
    this.staggerFill.height = this._staggerBarHeight;
    this.staggerFill.setOrigin(0, 0.5);
    this.staggerFill.setFillStyle(hero.staggered ? 0xe74c3c : (this._displayStagger >= 0.9 ? 0xe74c3c : 0xe67e22), 1);
    this.staggerFill.setVisible(hero.alive);
    this.staggerBg.setVisible(hero.alive);
    this.staggerLabel.setVisible(hero.alive);
    const staggerPct = Math.round((hero.stagger / MAX_STAGGER) * 100);
    this.staggerValueText
      .setText(hero.staggered ? '!' : `${staggerPct}%`)
      .setVisible(hero.alive);
    this.staggeredBadge.setVisible(hero.alive && hero.staggered);
  }

  /** Rebind to a different hero (e.g. when switching active in team battle) */
  setHero(hero) {
    this.hero = hero;
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
