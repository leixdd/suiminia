/**
 * Defensive AI:
 * - 80–100% HP: alternating guard and attack
 * - Below 79% HP: 60% chance to guard
 * - Below 30% HP: 100% guard
 * - When staggered: attack (guard disabled)
 * @param {import('../../entities/Hero.js').Hero} aiHero
 * @param {import('../../entities/Hero.js').Hero[]} enemies
 * @param {{ actionRatio?: { attack?: number, guard?: number }, lastAction?: 'attack' | 'guard' | 'pass' }} [options]
 * @returns {{ type: 'attack' | 'guard' | 'pass', targetId?: string } | null}
 */
export function getAIAction(aiHero, enemies, options = {}) {
  if (!aiHero?.alive || !enemies?.length) return null;

  const alive = enemies.filter((e) => e.alive);
  if (alive.length === 0) return { type: 'pass' };

  const hpRatio = aiHero.currentHp / aiHero.maxHp;

  if (aiHero.staggered) {
    return { type: 'attack', targetId: alive[0].id };
  }

  if (hpRatio <= 0.3) {
    return { type: 'guard' };
  }

  if (hpRatio < 0.8) {
    const guardChance = options.actionRatio?.guard ?? 0.6;
    return Math.random() < guardChance
      ? { type: 'guard' }
      : { type: 'attack', targetId: alive[0].id };
  }

  // 80–100% HP: alternating guard and attack
  const last = options.lastAction;
  if (last === 'attack') return { type: 'guard' };
  if (last === 'guard') return { type: 'attack', targetId: alive[0].id };
  return Math.random() < 0.5 ? { type: 'guard' } : { type: 'attack', targetId: alive[0].id };
}
