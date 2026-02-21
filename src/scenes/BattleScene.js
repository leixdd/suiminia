/**
 * BattleScene: 1v1 layout (Player 1 left, Player 2/AI right), hero card placeholders,
 * ATB bars, and Attack command. Drives BattleEngine on update and on player input.
 */
import Phaser from 'phaser';
import { Hero } from '../entities/Hero.js';
import { HeroUI } from '../entities/HeroUI.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { getAIAction } from '../battle/Player2AI.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BATTLE_PADDING,
  CARD_WIDTH,
  CARD_HEIGHT,
  COMMAND_WINDOW_FONT,
  COMMAND_WINDOW_FONT_SIZE,
  FONT_SIZE_DAMAGE_POP,
  FONT_SIZE_DEBUG_UI,
  FONT_SIZE_TINY,
  FONT_SIZE_VICTORY,
  GAME_FONT,
} from '../config/constants.js';

/** Delay (ms) before AI executes its turn so the player sees it's the AI's turn */
const AI_TURN_DELAY_MS = 600;
/** Delay (ms) before showing victory so the player sees HP reach 0 */
const VICTORY_DELAY_MS = 1500;

/** Format number for display: integer as-is, otherwise 1 decimal */
function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Battle' });
  }

  create() {
    // --- Heroes (data only) ---
    const hero1 = new Hero({
      id: 'player1',
      name: 'Hero Alpha1',
      atk: 25,
      def: 5,
      spd: 10,
      maxHp: 100,
    });
    const hero2 = new Hero({
      id: 'player2',
      name: 'Hero Beta',
      atk: 20,
      def: 8,
      spd: 4,
      maxHp: 100,
    });

    this.hero1 = hero1;
    this.hero2 = hero2;
    this.engine = new BattleEngine([hero1, hero2]);

    // --- Layout: P1 left, P2 right ---
    const centerY = GAME_HEIGHT / 2;
    const leftX = BATTLE_PADDING + CARD_WIDTH / 2;
    const rightX = GAME_WIDTH - BATTLE_PADDING - CARD_WIDTH / 2;

    // Placeholder cards (clickable)
    this.card1 = this._makeHeroCard(leftX, centerY, 'player1', 'hero-placeholder');
    this.card2 = this._makeHeroCard(rightX, centerY, 'player2', 'hero-placeholder-p2');

    // Hero UI: name + HP bar + ATB bar in one entity per hero
    this.heroUI1 = new HeroUI(this, leftX, centerY, hero1);
    this.heroUI2 = new HeroUI(this, rightX, centerY, hero2);

    // Victory text (hidden until battle end)
    this.victoryText = this.add
      .text(GAME_WIDTH / 2, 60, '', { fontSize: FONT_SIZE_VICTORY, fontFamily: GAME_FONT, color: '#f1c40f' })
      .setOrigin(0.5)
      .setVisible(false);

    // --- Bottom bar: feedback (4/12) + command (8/12) in grid, side by side ---
    const uiDepth = 500;
    const barHeight = 56;
    const bottomBarY = GAME_HEIGHT - barHeight / 2;
    const feedbackWidth = (GAME_WIDTH * 4) / 12;
    const commandWidth = (GAME_WIDTH * 8) / 12;
    const feedbackCenterX = feedbackWidth / 2;
    const commandCenterX = GAME_WIDTH * (4 / 12) + commandWidth / 2;
    const gap = 4;

    // --- Debug window: damage calculation log (12/12 grid, above feedback, scrollable) ---
    const debugDepth = 450;
    const debugHeight = 72;
    const debugWidth = GAME_WIDTH - 32; // 12/12 full width with margin
    const debugCenterX = GAME_WIDTH / 2;
    const debugY = bottomBarY - barHeight / 2 - debugHeight / 2 - 8;
    const debugContentTop = debugY - debugHeight / 2 + 18;
    const debugContentHeight = debugHeight - 24;
    const debugLineHeight = 14;
    const debugMaxLines = 32;
    const debugPadding = 8;

    this.add
      .rectangle(debugCenterX, debugY, debugWidth, debugHeight, 0x0d1117, 0.95)
      .setStrokeStyle(1, 0x30363d)
      .setDepth(debugDepth);
    this.add
      .text(debugCenterX, debugY - debugHeight / 2 + 4, 'Damage (debug)', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0)
      .setDepth(debugDepth + 1);

    this.debugLogEntries = [];
    this.debugLogScroll = 0;
    this.debugLogContentHeight = 0;
    this.debugLogContainer = this.add.container(
      debugCenterX - debugWidth / 2 + debugPadding,
      debugContentTop
    ).setDepth(debugDepth + 1);
    const maskGraphics = this.make.graphics({ add: false });
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(
      debugCenterX - debugWidth / 2 + debugPadding,
      debugContentTop - 2,
      debugWidth - debugPadding * 2,
      debugContentHeight + 4
    );
    this.debugLogContainer.setMask(maskGraphics.createGeometryMask());
    this.debugLogPanelBounds = {
      left: debugCenterX - debugWidth / 2,
      right: debugCenterX + debugWidth / 2,
      top: debugY - debugHeight / 2,
      bottom: debugY + debugHeight / 2,
    };
    this.debugContentTop = debugContentTop;
    this.debugContentHeight = debugContentHeight;
    this.debugLineHeight = debugLineHeight;
    this.debugMaxLines = debugMaxLines;

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.debugLogPanelBounds) return;
      const { left, right, top, bottom } = this.debugLogPanelBounds;
      if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) {
        const maxScroll = Math.max(0, this.debugLogContentHeight - debugContentHeight);
        this.debugLogScroll = Phaser.Math.Clamp(
          this.debugLogScroll + deltaY,
          0,
          maxScroll
        );
        this._updateDebugLogScroll();
      }
    });

    // Feedback window (4/12) — left panel
    this.add
      .rectangle(feedbackCenterX, bottomBarY, feedbackWidth - gap / 2, barHeight, 0x2c3e50, 0.95)
      .setStrokeStyle(2, 0x5d6d7e)
      .setDepth(uiDepth);
    this.instructionText = this.add
      .text(feedbackCenterX, bottomBarY - 14, 'Waiting for a turn — ATB bars are filling.', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: feedbackWidth - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(uiDepth + 1);
    this.instructionSubtext = this.add
      .text(feedbackCenterX, bottomBarY + 4, 'Your bar: 0% · Enemy bar: 0% (faster SPD = fills sooner)', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: feedbackWidth - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(uiDepth + 1);

    // Command window (8/12) — right panel, Guard + Attack buttons
    this.add
      .rectangle(commandCenterX, bottomBarY, commandWidth - gap / 2, barHeight, 0x1e2a38, 0.95)
      .setStrokeStyle(2, 0x5d6d7e)
      .setDepth(uiDepth);
    const btnW = 100;
    const btnH = 40;
    const btnGap = 16;
    const attackX = commandCenterX + btnGap / 2 + btnW / 2;
    const guardX = commandCenterX - btnGap / 2 - btnW / 2;
    this.guardBtn = this.add
      .rectangle(guardX, bottomBarY, btnW, btnH, 0x3498db)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.guardBtnText = this.add
      .text(guardX, bottomBarY, 'Guard', { fontSize: COMMAND_WINDOW_FONT_SIZE, fontFamily: COMMAND_WINDOW_FONT, color: '#fff' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.attackBtn = this.add
      .rectangle(attackX, bottomBarY, btnW, btnH, 0x2ecc71)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.attackBtnText = this.add
      .text(attackX, bottomBarY, 'Attack', { fontSize: COMMAND_WINDOW_FONT_SIZE, fontFamily: COMMAND_WINDOW_FONT, color: '#fff' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(uiDepth + 1);

    this.guardBtn.on('pointerdown', () => this._onGuardClicked());
    this.guardBtn.on('pointerover', () => this.guardBtn.setAlpha(0.9));
    this.guardBtn.on('pointerout', () => this.guardBtn.setAlpha(1));
    this.attackBtn.on('pointerdown', () => this._onAttackClicked());
    this.attackBtn.on('pointerover', () => this.attackBtn.setAlpha(0.9));
    this.attackBtn.on('pointerout', () => this.attackBtn.setAlpha(1));

    // AI: avoid scheduling multiple times per turn
    this._aiScheduled = false;
    // Victory: delay so HP can be seen at 0 before result
    this._victoryScheduled = false;
  }

  update() {
    if (this.engine.isBattleOver()) {
      this._syncBars();
      if (!this._victoryScheduled) {
        this._victoryScheduled = true;
        this.time.delayedCall(VICTORY_DELAY_MS, () => this._showVictory());
      }
      return;
    }

    this.engine.tick();
    this._syncBars();
    this._updateAttackButtonVisibility();
    this._updateTurnInstructions();

    // When it's Player 2's turn, schedule AI action once (with delay for readability)
    const current = this.engine.currentTurnHero;
    if (current?.id === 'player2' && !this._aiScheduled) {
      this._aiScheduled = true;
      this.time.delayedCall(AI_TURN_DELAY_MS, () => {
        this._executeAI();
        this._aiScheduled = false;
      });
    }
  }

  _makeHeroCard(x, y, heroId, textureKey) {
    const card = this.add
      .image(x, y, textureKey)
      .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .setData('heroId', heroId);
    card.on('pointerover', () => card.setTint(0xcccccc));
    card.on('pointerout', () => card.clearTint());
    return card;
  }

  _syncBars() {
    this.heroUI1.sync();
    this.heroUI2.sync();
    this.card1.setAlpha(this.hero1.alive ? 1 : 0.4);
    this.card2.setAlpha(this.hero2.alive ? 1 : 0.4);
  }

  /**
   * Add a line to the damage debug log and trim if over max. Newest at bottom.
   * Includes formula line: effective_def = def + (def × 0.1) when guard; damage = max(1, atk - effective_def).
   * @param {{ atk: number, baseDef?: number, effectiveDef: number, damage: number, attacker: { name: string }, target: { name: string }, guarded?: boolean }} result
   */
  _addDamageLogEntry(result) {
    if (result.attacker == null || result.atk == null || result.effectiveDef == null) return;
    const baseDef = result.baseDef ?? result.effectiveDef;
    const guardStr = result.guarded ? ' (guard +10% DEF)' : '';
    const summaryLine = `${result.attacker.name} ${result.atk} ATK vs ${result.target.name} ${fmtNum(result.effectiveDef)} DEF${guardStr} → ${fmtNum(result.damage)} dmg`;
    let formulaLine;
    if (result.guarded) {
      const defTerm = `${baseDef} + (${baseDef} × 0.1)`;
      formulaLine = `  effective_def = ${defTerm} = ${fmtNum(result.effectiveDef)}; max(1, atk - effective_def) = max(1, ${result.atk} - ${fmtNum(result.effectiveDef)}) = ${fmtNum(result.damage)}`;
    } else {
      formulaLine = `  max(1, atk - def) = max(1, ${result.atk} - ${fmtNum(result.effectiveDef)}) = ${fmtNum(result.damage)}`;
    }

    const lineHeight = this.debugLineHeight;
    const y1 = this.debugLogContentHeight;
    const text1 = this.add
      .text(0, y1, summaryLine, { fontSize: FONT_SIZE_DEBUG_UI, fontFamily: GAME_FONT, color: '#b0b0b0' })
      .setOrigin(0, 0);
    this.debugLogContainer.add(text1);
    this.debugLogEntries.push({ text: text1, y: y1 });
    this.debugLogContentHeight += lineHeight;

    const y2 = this.debugLogContentHeight;
    const text2 = this.add
      .text(0, y2, formulaLine, { fontSize: FONT_SIZE_DEBUG_UI, fontFamily: GAME_FONT, color: '#8b949e' })
      .setOrigin(0, 0);
    this.debugLogContainer.add(text2);
    this.debugLogEntries.push({ text: text2, y: y2 });
    this.debugLogContentHeight += lineHeight;

    while (this.debugLogEntries.length > this.debugMaxLines) {
      const old = this.debugLogEntries.shift();
      old.text.destroy();
      const old2 = this.debugLogEntries.shift();
      old2.text.destroy();
      for (let i = 0; i < this.debugLogEntries.length; i++) {
        this.debugLogEntries[i].text.y = i * lineHeight;
        this.debugLogEntries[i].y = i * lineHeight;
      }
      this.debugLogContentHeight = this.debugLogEntries.length * lineHeight;
    }

    this.debugLogScroll = Math.max(
      0,
      this.debugLogContentHeight - this.debugContentHeight
    );
    this._updateDebugLogScroll();
  }

  _updateDebugLogScroll() {
    this.debugLogContainer.y =
      this.debugContentTop +
      this.debugContentHeight -
      this.debugLogContentHeight +
      this.debugLogScroll;
  }

  _updateAttackButtonVisibility() {
    const current = this.engine.currentTurnHero;
    const isPlayer1Turn = current && current.id === 'player1';
    const canAct = isPlayer1Turn && !this.engine.isBattleOver();
    this.attackBtn.setVisible(canAct);
    this.attackBtnText.setVisible(canAct);
    this.guardBtn.setVisible(canAct);
    this.guardBtnText.setVisible(canAct);
  }

  /**
   * Update the on-screen instructions to describe current turn state and what to do next.
   */
  _updateTurnInstructions() {
    if (this.engine.isBattleOver()) {
      this.instructionText.setText('Battle over.');
      this.instructionSubtext.setText('');
      return;
    }

    const current = this.engine.currentTurnHero;
    const pct1 = Math.round(this.hero1.chargeProgress() * 100);
    const pct2 = Math.round(this.hero2.chargeProgress() * 100);

    if (current?.id === 'player1') {
      this.instructionText.setText("Your turn — choose an action.");
      this.instructionSubtext.setText("Attack or Guard (+10% DEF until your next turn).");
    } else if (current?.id === 'player2') {
      this.instructionText.setText("Enemy's turn.");
      this.instructionSubtext.setText("They will attack in a moment.");
    } else {
      this.instructionText.setText("Waiting for a turn — ATB bars are filling.");
      this.instructionSubtext.setText(`Your bar: ${pct1}% · Enemy bar: ${pct2}% (faster SPD = fills sooner)`);
    }
  }

  /**
   * Ragnarok-style damage pop: floats up with ease-in-out, scale pop (ease-out), then fades.
   * @param {number} x - World x (e.g. target card center)
   * @param {number} y - World y (e.g. above target card)
   * @param {number} amount - Damage value to display (e.g. result.damage)
   */
  _showDamagePop(x, y, amount) {
    const startY = y - 15;
    const endY = startY - 55;
    const dmgText = this.add
      .text(x, startY, `-${fmtNum(amount)}`, {
        fontSize: FONT_SIZE_DAMAGE_POP,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0.5)
      .setDepth(600);

    // Pop scale: small -> slight overshoot -> settle (ease-out, like RO)
    this.tweens.add({
      targets: dmgText,
      scale: 1.15,
      duration: 280,
      ease: 'Back.Out',
    });

    // Float up + fade (ease-in-out: smooth start and end)
    this.tweens.add({
      targets: dmgText,
      y: endY,
      alpha: 0,
      duration: 900,
      ease: 'Power2.InOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  /**
   * Run Player 2 AI: get action and execute (attack player1). Same damage feedback as player.
   */
  _executeAI() {
    if (this.engine.isBattleOver()) return;
    const current = this.engine.currentTurnHero;
    if (!current || current.id !== 'player2') return;

    const action = getAIAction(current, [this.hero1]);
    if (!action || action.type === 'pass') {
      this.engine.actPass();
      return;
    }
    if (action.type === 'guard') {
      this.engine.actGuard();
      return;
    }

    const target = action.targetId === 'player1' ? this.hero1 : this.hero2;
    if (!target.alive) {
      this.engine.actPass();
      return;
    }

    const result = this.engine.actAttack(target);
    this._addDamageLogEntry(result);
    if (result.damage > 0) {
      const targetCard = target.id === 'player1' ? this.card1 : this.card2;
      this._showDamagePop(targetCard.x, targetCard.y, result.damage);
    }
  }

  _onGuardClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || current.id !== 'player1') return;
    this.engine.actGuard();
  }

  _onAttackClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || current.id !== 'player1') return;

    // Attack is always directed at the enemy (Player 2)
    const target = this.hero2;
    if (!target.alive) return;

    const result = this.engine.actAttack(target);
    this._addDamageLogEntry(result);
    if (result.damage > 0) {
      this._showDamagePop(this.card2.x, this.card2.y, result.damage);
    }
  }

  _showVictory() {
    if (this.victoryText.visible) return;
    const winnerId = this.engine.getVictor();
    const message = winnerId
      ? (winnerId === 'player1' ? 'Player 1 wins!' : 'Player 2 wins!')
      : 'Draw!';
    this.victoryText.setText(message).setVisible(true);
  }
}
