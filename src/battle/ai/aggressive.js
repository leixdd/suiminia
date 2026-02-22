/**
 * Aggressive AI: always attacks. Uses action ratio only for pass (when no valid target).
 * @param {import('../../entities/Hero.js').Hero} aiHero
 * @param {import('../../entities/Hero.js').Hero[]} enemies
 * @param {{ actionRatio?: { attack?: number, guard?: number } }} [options]
 * @returns {{ type: 'attack' | 'guard' | 'pass', targetId?: string } | null}
 */
export function getAIAction(aiHero, enemies, options = {}) {
  if (!aiHero?.alive || !enemies?.length) return null;

  const alive = enemies.filter((e) => e.alive);
  if (alive.length === 0) return { type: 'pass' };

  const target = alive[0];
  return { type: 'attack', targetId: target.id };
}
