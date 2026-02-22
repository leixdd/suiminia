/**
 * Hero entity: stats (ATK, DEF, SPD) and ATB charge state.
 * Used by the BattleEngine for turn order and by DamageCalculator for combat math.
 */
import { MAX_CHARGE, MAX_STAGGER } from '../config/constants.js';

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
    /** When true, incoming damage uses +10% DEF. Persists until this hero's next action (Attack/Pass/Switch)—i.e. stays true while ATB is filling. */
    this.guarding = false;

    /** Stagger meter 0..MAX_STAGGER. Fills when hit while guarding; when full, hero becomes staggered and meter resets. */
    this.stagger = 0;
    /** When true, this hero is Staggered and takes STAGGERED_DAMAGE_MULTIPLIER (200%) damage. Cleared when hero acts. */
    this.staggered = false;

    /** Battle stats (reset per battle, updated by BattleEngine) */
    this.timesAttacked = 0;
    this.damageDealt = 0;
    this.damageReceived = 0;
  }

  /** Start guarding: DEF multiplied by GUARD_DEF_MULTIPLIER on incoming damage until next action */
  startGuarding() {
    this.guarding = true;
  }

  /** Clear guard state (e.g. when attacking or passing) */
  clearGuarding() {
    this.guarding = false;
  }

  /**
   * Add stagger charge (e.g. when hit while guarding). If meter reaches MAX_STAGGER, hero becomes staggered and meter resets.
   * @param {number} amount
   */
  addStagger(amount) {
    this.stagger = Math.min(MAX_STAGGER, this.stagger + amount);
    if (this.stagger >= MAX_STAGGER) {
      this.staggered = true;
      this.stagger = 0;
    }
  }

  /** Clear staggered status (e.g. when hero takes an action). */
  clearStaggered() {
    this.staggered = false;
  }

  /** Stagger progress 0..1 for UI bar */
  staggerProgress() {
    return Math.max(0, Math.min(1, this.stagger / MAX_STAGGER));
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

  /**
   * Create a placeholder hero for empty party slots (alive: false, never gets turns).
   * @param {string} id - e.g. 'player2', 'enemy3'
   * @returns {Hero}
   */
  static createEmpty(id) {
    const hero = new Hero({
      id,
      name: '—',
      atk: 0,
      def: 0,
      spd: 1,
      maxHp: 1,
      currentHp: 0,
    });
    hero.alive = false;
    return hero;
  }
}
