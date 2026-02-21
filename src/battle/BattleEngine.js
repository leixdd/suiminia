/**
 * Core Battle Engine: team battle (Pokemon-style).
 * Two teams of 3 heroes; one "active" per side. Only active heroes get turns and can be targeted.
 * When active dies, that side must choose next hero (player picks, AI picks randomly).
 */
import { TurnQueue } from './TurnQueue.js';
import { DamageCalculator } from './DamageCalculator.js';
import {
  MAX_CHARGE,
  ATB_DAMAGE_DRAWBACK,
  ATTACKER_ATB_DRAWBACK,
  GUARD_DEF_MULTIPLIER,
  GUARD_ATB_DRAWBACK_WHEN_HIT,
  GUARD_ATB_DRAWBACK_WHEN_NOT_HIT,
} from '../config/constants.js';

export class BattleEngine {
  /**
   * @param {import('../entities/Hero.js').Hero[]} playerTeam - 3 heroes
   * @param {import('../entities/Hero.js').Hero[]} enemyTeam - 3 heroes
   */
  constructor(playerTeam, enemyTeam) {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.playerActiveIndex = 0;
    this.enemyActiveIndex = 0;
    this.turnQueue = new TurnQueue(this._getActiveHeroes());
    /** Current actor (who must choose an action) */
    this.currentTurnHero = null;
    /** 'player' | 'enemy' | null when battle over */
    this.victorId = null;
    /** When true, player must select next hero before battle continues */
    this.pendingPlayerSwitch = false;
    /** When true, AI will select next hero (scene triggers then we clear) */
    this.pendingEnemySwitch = false;
  }

  _getActiveHeroes() {
    return [
      this.playerTeam[this.playerActiveIndex],
      this.enemyTeam[this.enemyActiveIndex],
    ];
  }

  _rebuildTurnQueue() {
    this.turnQueue = new TurnQueue(this._getActiveHeroes());
  }

  /** @returns {import('../entities/Hero.js').Hero} */
  getPlayerActive() {
    return this.playerTeam[this.playerActiveIndex];
  }

  /** @returns {import('../entities/Hero.js').Hero} */
  getEnemyActive() {
    return this.enemyTeam[this.enemyActiveIndex];
  }

  /**
   * Advance ATB by one tick. If in switch phase, no-op until switch is done.
   */
  tick() {
    if (this.victorId !== null) return;
    if (this.pendingPlayerSwitch || this.pendingEnemySwitch) return;
    if (this.currentTurnHero !== null) return;

    this.turnQueue.tick();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  /**
   * Execute an attack: currentTurnHero attacks targetHero.
   * If target is the active hero and dies, sets pending switch for that side.
   */
  actAttack(targetHero, options = {}) {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) {
      return { damage: 0, targetAlive: targetHero?.alive ?? false };
    }
    if (!targetHero?.alive) {
      return { damage: 0, targetAlive: false };
    }

    const effectiveDef = targetHero.guarding
      ? targetHero.def * GUARD_DEF_MULTIPLIER
      : targetHero.def;
    this.currentTurnHero.clearGuarding();
    const damage = DamageCalculator.calculate(
      this.currentTurnHero.atk,
      effectiveDef,
      options
    );
    targetHero.takeDamage(damage);
    // Drawback: taking damage reduces ATB
    const drawback = MAX_CHARGE * ATB_DAMAGE_DRAWBACK;
    targetHero.charge = Math.max(0, targetHero.charge - drawback);
    // Guard drawback: when attacked while guarding, extra ATB penalty
    if (targetHero.guarding) {
      targetHero.charge = Math.max(0, targetHero.charge - MAX_CHARGE * GUARD_ATB_DRAWBACK_WHEN_HIT);
    }
    this.currentTurnHero.consumeTurn();
    const previousTurn = this.currentTurnHero;
    // Attacker drawback: their ATB is set to a negative value so they must fill more before acting again
    previousTurn.charge = -MAX_CHARGE * ATTACKER_ATB_DRAWBACK;
    this.currentTurnHero = null;

    const targetWasPlayerActive =
      this.playerTeam.includes(targetHero) &&
      this.playerTeam[this.playerActiveIndex] === targetHero;
    const targetWasEnemyActive =
      this.enemyTeam.includes(targetHero) &&
      this.enemyTeam[this.enemyActiveIndex] === targetHero;

    if (targetHero.alive) {
      this.turnQueue.tickUntilReady();
      this.currentTurnHero = this.turnQueue.getCurrentTurn();
    } else {
      if (targetWasPlayerActive) this.pendingPlayerSwitch = true;
      if (targetWasEnemyActive) this.pendingEnemySwitch = true;
      if (!this.pendingPlayerSwitch && !this.pendingEnemySwitch) {
        this.turnQueue.tickUntilReady();
        this.currentTurnHero = this.turnQueue.getCurrentTurn();
      }
    }

    this._checkVictory();

    const baseDef = targetHero.def;
    return {
      damage,
      targetAlive: targetHero.alive,
      attacker: previousTurn,
      target: targetHero,
      atk: previousTurn.atk,
      baseDef,
      effectiveDef,
      guarded: targetHero.guarding,
    };
  }

  actGuard() {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) return;
    this.currentTurnHero.startGuarding();
    this.currentTurnHero.consumeTurn();
    // Guard drawback when not attacked: ATB set to negative so they fill more before next turn
    this.currentTurnHero.charge = -MAX_CHARGE * GUARD_ATB_DRAWBACK_WHEN_NOT_HIT;
    this.currentTurnHero = null;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  actPass() {
    if (this.currentTurnHero === null) return;
    this.currentTurnHero.clearGuarding();
    this.currentTurnHero.consumeTurn();
    this.currentTurnHero = null;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  /**
   * Player voluntarily switches hero (uses their turn). Opens switch UI; valid only on player's turn.
   * @returns {boolean}
   */
  requestVoluntarySwitch() {
    if (this.victorId !== null) return false;
    if (this.currentTurnHero === null || !this.playerTeam.includes(this.currentTurnHero)) return false;
    this.currentTurnHero.clearGuarding();
    this.currentTurnHero.consumeTurn();
    this.currentTurnHero = null;
    this.pendingPlayerSwitch = true;
    return true;
  }

  /**
   * Player selects which hero to send next. Valid only when pendingPlayerSwitch.
   * @param {number} index - 0..2, must be alive and not already active
   */
  selectNextPlayerHero(index) {
    if (!this.pendingPlayerSwitch) return false;
    if (index < 0 || index >= this.playerTeam.length) return false;
    const hero = this.playerTeam[index];
    if (!hero.alive) return false;
    this.playerActiveIndex = index;
    this._rebuildTurnQueue();
    this.pendingPlayerSwitch = false;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
    return true;
  }

  /**
   * AI selects a random alive enemy hero to send next. Valid only when pendingEnemySwitch.
   */
  selectNextEnemyHeroRandom() {
    if (!this.pendingEnemySwitch) return false;
    const alive = this.enemyTeam
      .map((h, i) => ({ hero: h, i }))
      .filter(({ hero }) => hero.alive);
    if (alive.length === 0) return false;
    const chosen = alive[Math.floor(Math.random() * alive.length)];
    this.enemyActiveIndex = chosen.i;
    this._rebuildTurnQueue();
    this.pendingEnemySwitch = false;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
    return true;
  }

  /** @returns {boolean} */
  isBattleOver() {
    return this.victorId !== null;
  }

  /** @returns {'player' | 'enemy' | null} */
  getVictor() {
    return this.victorId;
  }

  _checkVictory() {
    const playerAlive = this.playerTeam.filter((h) => h.alive).length;
    const enemyAlive = this.enemyTeam.filter((h) => h.alive).length;
    if (playerAlive === 0) this.victorId = 'enemy';
    else if (enemyAlive === 0) this.victorId = 'player';
  }
}
