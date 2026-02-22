/**
 * Balanced AI: chooses attack or guard by action ratio (default 50% attack, 50% guard).
 * When staggered, guard is disabled so attack is chosen.
 * @param {import('../../entities/Hero.js').Hero} aiHero
 * @param {import('../../entities/Hero.js').Hero[]} enemies
 * @param {{ actionRatio?: { attack?: number, guard?: number } }} [options]
 * @returns {{ type: 'attack' | 'guard' | 'pass', targetId?: string } | null}
 */
export function getAIAction(aiHero, enemies, options = {}) {
  if (!aiHero?.alive || !enemies?.length) return null;

  const alive = enemies.filter((e) => e.alive);
  if (alive.length === 0) return { type: 'pass' };

  if (aiHero.staggered) {
    return { type: 'attack', targetId: alive[0].id };
  }

  const attackRatio = options.actionRatio?.attack ?? 0.5;
  const guardRatio = options.actionRatio?.guard ?? 0.5;
  const r = Math.random();
  if (r < attackRatio) {
    return { type: 'attack', targetId: alive[0].id };
  }
  if (r < attackRatio + guardRatio) {
    return { type: 'guard' };
  }
  return { type: 'attack', targetId: alive[0].id };
}
