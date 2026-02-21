/**
 * Hero entity: stats (ATK, DEF, SPD) and ATB charge state.
 * Used by the BattleEngine for turn order and by DamageCalculator for combat math.
 */
import { MAX_CHARGE } from '../config/constants.js';

export class Hero {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique id (e.g. 'player1', 'player2')
   * @param {string} options.name - Display name
   * @param {number} options.atk - Raw attack value
   * @param {number} options.def - Defense (subtracted from incoming damage)
   * @param {number} options.spd - Speed (charge rate for ATB bar)
   * @param {number} [options.maxHp=100] - Max hit points
   * @param {number} [options.currentHp] - Current HP (defaults to maxHp)
   */
  constructor({ id, name, atk, def, spd, maxHp = 100, currentHp }) {
    this.id = id;
    this.name = name;
    this.atk = atk;
    this.def = def;
    this.spd = Math.max(1, spd); // ensure positive for charge math
    this.maxHp = maxHp;
    this.currentHp = currentHp ?? maxHp;

    /** ATB charge 0..MAX_CHARGE; when >= MAX_CHARGE hero can act */
    this.charge = 0;
    /** Whether this hero is still in battle (alive) */
    this.alive = this.currentHp > 0;
    /** When true, incoming damage uses +10% DEF until next action */
    this.guarding = false;
  }

  /** Start guarding: DEF multiplied by GUARD_DEF_MULTIPLIER on incoming damage until next action */
  startGuarding() {
    this.guarding = true;
  }

  /** Clear guard state (e.g. when attacking or passing) */
  clearGuarding() {
    this.guarding = false;
  }

  /** Returns true when charge is full and hero can take a turn */
  isReady() {
    return this.alive && this.charge >= MAX_CHARGE;
  }

  /** Reset charge after taking a turn (optional overflow carry could be added later) */
  consumeTurn() {
    this.charge = 0;
  }

  /** Apply damage (decimal allowed); updates currentHp and alive */
  takeDamage(amount) {
    const actual = Math.max(0, amount);
    this.currentHp = Math.max(0, this.currentHp - actual);
    this.alive = this.currentHp > 0;
    return actual;
  }

  /** Heal (decimal allowed) */
  heal(amount) {
    const actual = Math.max(0, amount);
    this.currentHp = Math.min(this.maxHp, this.currentHp + actual);
    return actual;
  }

  /** Charge progress as 0..1 for UI bar (clamped; charge can be negative after attacker drawback) */
  chargeProgress() {
    return Math.max(0, Math.min(1, this.charge / MAX_CHARGE));
  }
}
