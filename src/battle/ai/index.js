/**
 * AI behavior dispatcher. Uses enemy team's behavior and actionRatio config.
 * @param {import('../entities/Hero.js').Hero} aiHero
 * @param {import('../entities/Hero.js').Hero[]} enemies
 * @param {{ behavior?: string, actionRatio?: { attack?: number, guard?: number }, lastAction?: 'attack' | 'guard' | 'pass' }} [options]
 * @returns {{ type: 'attack' | 'guard' | 'pass', targetId?: string } | null}
 */
import { getAIAction as aggressive } from './aggressive.js';
import { getAIAction as defensive } from './defensive.js';
import { getAIAction as balanced } from './balanced.js';

const BEHAVIORS = {
  aggressive,
  defensive,
  balanced,
};

const DEFAULT_BEHAVIOR = 'aggressive';

export function getAIAction(aiHero, enemies, options = {}) {
  const key = (options.behavior || DEFAULT_BEHAVIOR).toLowerCase();
  const fn = BEHAVIORS[key] ?? BEHAVIORS[DEFAULT_BEHAVIOR];
  return fn(aiHero, enemies, options);
}

export { aggressive, defensive, balanced };
