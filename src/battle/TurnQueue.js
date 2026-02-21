/**
 * Turn queue: determines whose turn it is based on ATB charge (SPD).
 * Heroes gain charge each tick; when charge >= MAX_CHARGE they become "ready".
 * This module does not advance time—BattleEngine does that and then queries who's ready.
 */
import { MAX_CHARGE, CHARGE_PER_TICK } from '../config/constants.js';

export class TurnQueue {
  /**
   * @param {import('../entities/Hero.js').Hero[]} heroes - All heroes in battle (e.g. [player1, player2])
   */
  constructor(heroes) {
    this.heroes = [...heroes];
  }

  /**
   * Advance ATB by one tick: each alive hero gains charge proportional to SPD.
   * Charge is capped at MAX_CHARGE.
   */
  tick() {
    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      hero.charge = Math.min(MAX_CHARGE, hero.charge + hero.spd * CHARGE_PER_TICK);
    }
  }

  /**
   * Get all heroes that are currently ready (charge >= MAX_CHARGE).
   * In 1v1 typically one at a time; multiple ready = tie-break by highest charge (then by SPD).
   * @returns {import('../entities/Hero.js').Hero[]}
   */
  getReady() {
    return this.heroes
      .filter((h) => h.isReady())
      .sort((a, b) => {
        if (b.charge !== a.charge) return b.charge - a.charge;
        return b.spd - a.spd;
      });
  }

  /**
   * Get the single hero who should act next (first ready, or null if none).
   * @returns {import('../entities/Hero.js').Hero | null}
   */
  getCurrentTurn() {
    const ready = this.getReady();
    return ready.length > 0 ? ready[0] : null;
  }

  /**
   * Check if at least one hero is ready to act.
   * @returns {boolean}
   */
  hasReadyHero() {
    return this.getReady().length > 0;
  }

  /**
   * Run ticks until at least one hero is ready (avoid infinite loop with a max tick cap).
   * @param {number} maxTicks
   * @returns {boolean} true if someone is ready, false if we hit maxTicks
   */
  tickUntilReady(maxTicks = 1000) {
    let ticks = 0;
    while (!this.hasReadyHero() && ticks < maxTicks) {
      this.tick();
      ticks++;
    }
    return this.hasReadyHero();
  }
}
