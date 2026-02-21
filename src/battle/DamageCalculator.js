/**
 * Damage calculation: FinalDamage = max(MIN_DAMAGE, ATK - DEF).
 * Kept in a dedicated class so modifiers (buffs, armor break, etc.) can be added later.
 */
import { MIN_DAMAGE } from '../config/constants.js';

export class DamageCalculator {
  /**
   * Compute final damage dealt by attacker to defender.
   * @param {number} atk - Attacker's ATK stat
   * @param {number} def - Defender's DEF stat
   * @param {Object} [options] - Optional modifiers for future use (e.g. { multiplier: 1.5 })
   * @returns {number} Final damage (at least MIN_DAMAGE)
   */
  static calculate(atk, def, options = {}) {
    const raw = Math.max(0, atk - def);
    const base = Math.max(MIN_DAMAGE, raw);
    const multiplier = options.multiplier ?? 1;
    return Math.max(MIN_DAMAGE, base * multiplier);
  }

  /**
   * Convenience: compute damage from one Hero to another.
   * If defender is guarding, uses DEF × 1.1 (+10% DEF).
   * @param {import('../entities/Hero.js').Hero} attacker
   * @param {import('../entities/Hero.js').Hero} defender
   * @param {Object} [options]
   * @returns {number}
   */
  static fromHeroToHero(attacker, defender, options = {}) {
    let def = defender.def;
    if (defender.guarding) def = def * 1.1;
    return this.calculate(attacker.atk, def, options);
  }
}
