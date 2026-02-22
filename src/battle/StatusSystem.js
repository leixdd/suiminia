/**
 * Status system: buffs and debuffs that affect heroes in battle.
 * Statuses are applied/checked by BattleEngine and affect DamageCalculator or other logic.
 */
import { STAGGERED_DAMAGE_MULTIPLIER } from '../config/constants.js';

/** Status id for "Staggered": hero takes increased damage (STAGGERED_DAMAGE_MULTIPLIER). */
export const STATUS_STAGGERED = 'staggered';

/**
 * @param {string} statusId
 * @returns {number} Damage multiplier when defender has this status (1 = no change)
 */
export function getDamageTakenMultiplier(statusId) {
  if (statusId === STATUS_STAGGERED) return STAGGERED_DAMAGE_MULTIPLIER;
  return 1;
}
