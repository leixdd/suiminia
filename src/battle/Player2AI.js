/**
 * Player 2 AI: decides action when it's the AI's turn.
 * Returns a command { type, targetId? } so BattleScene can execute it.
 * Can choose Attack, Guard, or Pass.
 */

/** HP ratio below which the AI will prefer to Guard (e.g. 0.4 = 40%) */
const GUARD_HP_THRESHOLD = 0.4;

/**
 * Get the action the AI should take this turn.
 * @param {import('../entities/Hero.js').Hero} aiHero - The AI-controlled hero (player2)
 * @param {import('../entities/Hero.js').Hero[]} enemies - Alive enemies (e.g. [hero1])
 * @returns {{ type: 'attack' | 'guard' | 'pass', targetId?: string } | null}
 */
export function getAIAction(aiHero, enemies) {
  if (!aiHero?.alive || enemies.length === 0) return null;

  const aliveEnemies = enemies.filter((e) => e.alive);
  if (aliveEnemies.length === 0) return { type: 'pass' };

  const hpRatio = aiHero.currentHp / aiHero.maxHp;
  if (hpRatio <= GUARD_HP_THRESHOLD) {
    return { type: 'guard' };
  }

  const target = aliveEnemies[0];
  return { type: 'attack', targetId: target.id };
}
