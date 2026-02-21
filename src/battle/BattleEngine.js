/**
 * Core Battle Engine: ties together TurnQueue, DamageCalculator, and Hero state.
 * Manages ATB ticks, turn execution (e.g. Attack), and win/loss state.
 * Designed to be driven by BattleScene (scene calls tick/act when appropriate).
 */
import { TurnQueue } from './TurnQueue.js';
import { DamageCalculator } from './DamageCalculator.js';

export class BattleEngine {
  /**
   * @param {import('../entities/Hero.js').Hero[]} heroes - [player1Hero, player2Hero]
   */
  constructor(heroes) {
    this.heroes = heroes;
    this.turnQueue = new TurnQueue(heroes);
    /** Current actor (who must choose an action); set when someone becomes ready */
    this.currentTurnHero = null;
    /** Battle over when one side has no alive heroes */
    this.victorId = null;
  }

  /**
   * Advance ATB by one tick. Call every frame or on a timer from the scene.
   * If no one is currently acting and someone becomes ready, sets currentTurnHero.
   */
  tick() {
    if (this.victorId !== null) return;
    if (this.currentTurnHero !== null) return; // wait for player to choose action

    this.turnQueue.tick();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  /**
   * Execute an attack: currentTurnHero attacks targetHero.
   * Applies damage, consumes the turn (resets charge), then clears currentTurnHero.
   * @param {import('../entities/Hero.js').Hero} targetHero
   * @param {Object} [options] - Passed to DamageCalculator (e.g. multiplier)
   * @returns {{ damage: number, targetAlive: boolean }}
   */
  actAttack(targetHero, options = {}) {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) {
      return { damage: 0, targetAlive: targetHero?.alive ?? false };
    }
    if (!targetHero?.alive) {
      return { damage: 0, targetAlive: false };
    }

    const effectiveDef = targetHero.guarding
      ? (targetHero.def + (targetHero.def * 0.1)) // +10% DEF
      : targetHero.def;
    this.currentTurnHero.clearGuarding();
    const damage = DamageCalculator.calculate(
      this.currentTurnHero.atk,
      effectiveDef,
      options
    );
    targetHero.takeDamage(damage);
    this.currentTurnHero.consumeTurn();
    const previousTurn = this.currentTurnHero;
    this.currentTurnHero = null;

    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
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

  /**
   * Guard: +10% DEF on incoming damage until the hero's next action. Consumes the turn.
   */
  actGuard() {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) return;
    this.currentTurnHero.startGuarding();
    this.currentTurnHero.consumeTurn();
    this.currentTurnHero = null;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  /**
   * Skip / pass turn (for future "Item" etc.).
   */
  actPass() {
    if (this.currentTurnHero === null) return;
    this.currentTurnHero.clearGuarding();
    this.currentTurnHero.consumeTurn();
    this.currentTurnHero = null;
    this.turnQueue.tickUntilReady();
    this.currentTurnHero = this.turnQueue.getCurrentTurn();
  }

  /** @returns {boolean} */
  isBattleOver() {
    return this.victorId !== null;
  }

  /** @returns {string | null} Winner hero id, or null */
  getVictor() {
    return this.victorId;
  }

  _checkVictory() {
    const alive = this.heroes.filter((h) => h.alive);
    if (alive.length <= 1) {
      this.victorId = alive.length === 1 ? alive[0].id : null;
    }
  }
}
