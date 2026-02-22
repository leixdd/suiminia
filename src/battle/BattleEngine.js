/**
 * Core Battle Engine: team battle (Pokemon-style).
 * Two teams of 3 heroes; one "active" per side. Only active heroes get turns and can be targeted.
 * When active dies, that side must choose next hero (player picks, AI picks randomly).
 */
import { TurnQueue } from './TurnQueue.js';
import { DamageCalculator } from './DamageCalculator.js';
import {
  MAX_CHARGE,
  ATB_DAMAGE_DRAWBACK,
  ATTACKER_ATB_DRAWBACK,
  GUARD_DEF_MULTIPLIER,
  GUARD_ATB_DRAWBACK_WHEN_HIT,
  GUARD_ATB_DRAWBACK_WHEN_NOT_HIT,
  STAGGER_CHARGE_PER_GUARD_HIT,
} from '../config/constants.js';
import { STATUS_STAGGERED, getDamageTakenMultiplier } from './StatusSystem.js';
import { getSkillById, getSkillPower, getMultiHitDamageModifier } from '../data/skills.js';

export class BattleEngine {
  /**
   * @param {import('../entities/Hero.js').Hero[]} playerTeam - 3 heroes
   * @param {import('../entities/Hero.js').Hero[]} enemyTeam - 3 heroes
   */
  constructor(playerTeam, enemyTeam) {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.playerActiveIndex = 0;
    this.enemyActiveIndex = 0;
    this.turnQueue = new TurnQueue(this._getActiveHeroes());
    /** Current actor (who must choose an action) */
    this.currentTurnHero = null;
    /** 'player' | 'enemy' | null when battle over */
    this.victorId = null;
    /** When true, player must select next hero before battle continues */
    this.pendingPlayerSwitch = false;
    /** When true, AI will select next hero (scene triggers then we clear) */
    this.pendingEnemySwitch = false;
  }

  _getActiveHeroes() {
    return [
      this.playerTeam[this.playerActiveIndex],
      this.enemyTeam[this.enemyActiveIndex],
    ];
  }

  _rebuildTurnQueue() {
    this.turnQueue = new TurnQueue(this._getActiveHeroes());
  }

  /**
   * Advance time until someone is ready, then return the next hero who should act (skipping staggered heroes).
   * Staggered heroes lose their turn (ATB reset) and recover from stagger; time advances until a non-staggered hero is ready.
   * @returns {import('../entities/Hero.js').Hero | null}
   */
  _getNextTurnHero() {
    const maxAttempts = 20;
    this.turnQueue.tickUntilReady();
    const ready = this.turnQueue.getCurrentTurn();
    if (!ready) return null;
    if (ready.staggered) {
      for (let i = 0; i < maxAttempts; i++) {
        ready.consumeTurn();
        console.log('staggered hero', ready.name);
        continue;
      }
      ready.clearStaggered();
      console.log('staggered hero', ready.name);
    }
    return ready;
  }

  /** @returns {import('../entities/Hero.js').Hero} */
  getPlayerActive() {
    return this.playerTeam[this.playerActiveIndex];
  }

  /** @returns {import('../entities/Hero.js').Hero} */
  getEnemyActive() {
    return this.enemyTeam[this.enemyActiveIndex];
  }

  /**
   * Advance ATB by one tick. If in switch phase, no-op until switch is done.
   * When the ready hero is staggered, they do not get a turn: their ATB is reset to 0 and no action is taken.
   */
  tick() {
    if (this.victorId !== null) return;
    if (this.pendingPlayerSwitch || this.pendingEnemySwitch) return;
    if (this.currentTurnHero !== null) return;

    this.turnQueue.tick();
    const ready = this.turnQueue.getCurrentTurn();
    if (ready?.staggered) {
      ready.clearStaggered();
      ready.consumeTurn();
      this.currentTurnHero = null;
    } else {
      this.currentTurnHero = ready;
    }
  }

  /**
   * Execute an attack: currentTurnHero attacks targetHero.
   * If target is the active hero and dies, sets pending switch for that side.
   */
  actAttack(targetHero, options = {}) {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) {
      return { damage: 0, targetAlive: targetHero?.alive ?? false };
    }
    if (this.currentTurnHero.staggered) {
      return { damage: 0, targetAlive: targetHero?.alive ?? false };
    }
    if (!targetHero?.alive) {
      return { damage: 0, targetAlive: false };
    }

    // Only the attacker leaves guard when they act; target stays guarding until their next action (while ATB fills).
    this.currentTurnHero.clearGuarding();
    // Skill: use skill power (Attack + SkillDamage) + (Attack × multiplier) as effective ATK; otherwise use raw ATK
    const skill = options.skillId ? getSkillById(options.skillId) : null;
    const effectiveAtk = skill
      ? getSkillPower(this.currentTurnHero.atk, skill)
      : this.currentTurnHero.atk;
    const hits = skill?.hits ?? 1;
    const baseMultiplier = options.multiplier ?? 1;
    const drawback = MAX_CHARGE * ATB_DAMAGE_DRAWBACK;
    let totalDamage = 0;
    /** @type {number[]} */
    const hitDamages = [];
    for (let i = 0; i < hits && targetHero.alive; i++) {
      const effectiveDef = targetHero.guarding
        ? targetHero.def * GUARD_DEF_MULTIPLIER
        : targetHero.def;
      const damageMultiplier = targetHero.staggered
        ? baseMultiplier * getDamageTakenMultiplier(STATUS_STAGGERED)
        : baseMultiplier;
      let hitDamage = DamageCalculator.calculate(
        effectiveAtk,
        effectiveDef,
        { ...options, multiplier: damageMultiplier }
      );
      const hitMod = getMultiHitDamageModifier(i, hits, skill?.mhdmphp);
      hitDamage = Math.max(0, hitDamage * hitMod);
      const actual = targetHero.takeDamage(hitDamage);
      hitDamages.push(actual);
      totalDamage += actual;
      targetHero.charge = Math.max(0, targetHero.charge - drawback);
      if (targetHero.guarding) {
        targetHero.charge = Math.max(0, targetHero.charge - MAX_CHARGE * GUARD_ATB_DRAWBACK_WHEN_HIT);
        targetHero.addStagger(STAGGER_CHARGE_PER_GUARD_HIT);
      }
    }
    const damage = totalDamage;
    // Attacker clears their own staggered status when they act
    this.currentTurnHero.clearStaggered();
    this.currentTurnHero.consumeTurn();
    const previousTurn = this.currentTurnHero;
    // Attacker drawback: their ATB is set to a negative value so they must fill more before acting again
    previousTurn.charge = -MAX_CHARGE * ATTACKER_ATB_DRAWBACK;
    this.currentTurnHero = null;

    const targetWasPlayerActive =
      this.playerTeam.includes(targetHero) &&
      this.playerTeam[this.playerActiveIndex] === targetHero;
    const targetWasEnemyActive =
      this.enemyTeam.includes(targetHero) &&
      this.enemyTeam[this.enemyActiveIndex] === targetHero;

    if (targetHero.alive) {
      this.currentTurnHero = this._getNextTurnHero();
    } else {
      if (targetWasPlayerActive) this.pendingPlayerSwitch = true;
      if (targetWasEnemyActive) this.pendingEnemySwitch = true;
      if (!this.pendingPlayerSwitch && !this.pendingEnemySwitch) {
        this.currentTurnHero = this._getNextTurnHero();
      }
    }

    this._checkVictory();

    const baseDef = targetHero.def;
    const effectiveDef = targetHero.guarding
      ? targetHero.def * GUARD_DEF_MULTIPLIER
      : targetHero.def;
    previousTurn.timesAttacked += 1;
    previousTurn.damageDealt += damage;
    targetHero.damageReceived += damage;
    return {
      damage,
      targetAlive: targetHero.alive,
      attacker: previousTurn,
      target: targetHero,
      atk: effectiveAtk,
      baseDef,
      effectiveDef,
      guarded: targetHero.guarding,
      targetWasStaggered: targetHero.staggered,
      skill: skill ? { id: skill.id, name: skill.name, hits } : null,
      hitDamages: hitDamages.length > 1 ? hitDamages : undefined,
    };
  }

  actGuard() {
    if (this.currentTurnHero === null || !this.currentTurnHero.alive) return;
    if (this.currentTurnHero.staggered) return; // Guarding disabled while staggered
    this.currentTurnHero.clearStaggered();
    this.currentTurnHero.startGuarding();
    this.currentTurnHero.consumeTurn();
    // Guard persists until this hero's next action (Attack/Pass/Switch). ATB set negative so they fill before next turn.
    this.currentTurnHero.charge = -MAX_CHARGE * GUARD_ATB_DRAWBACK_WHEN_NOT_HIT;
    this.currentTurnHero = null;
    this.currentTurnHero = this._getNextTurnHero();
  }

  actPass() {
    if (this.currentTurnHero === null) return;
    this.currentTurnHero.clearStaggered();
    this.currentTurnHero.clearGuarding();
    this.currentTurnHero.consumeTurn();
    this.currentTurnHero = null;
    this.currentTurnHero = this._getNextTurnHero();
  }

  /**
   * Player voluntarily switches hero (uses their turn). Opens switch UI; valid only on player's turn.
   * @returns {boolean}
   */
  requestVoluntarySwitch() {
    if (this.victorId !== null) return false;
    if (this.currentTurnHero === null || !this.playerTeam.includes(this.currentTurnHero)) return false;
    // this.currentTurnHero.clearStaggered();
    // this.currentTurnHero.clearGuarding();
    // this.currentTurnHero.consumeTurn();
    // this.currentTurnHero = null;
    this.pendingPlayerSwitch = true;
    return true;
  }

  /**
   * Player selects which hero to send next. Valid only when pendingPlayerSwitch.
   * @param {number} index - 0..2, must be alive and not already active
   */
  selectNextPlayerHero(index) {
    if (!this.pendingPlayerSwitch) return false;
    if (index < 0 || index >= this.playerTeam.length) return false;
    const hero = this.playerTeam[index];
    if (!hero.alive) return false;
    this.playerActiveIndex = index;
    this._rebuildTurnQueue();
    this.pendingPlayerSwitch = false;
    this.currentTurnHero = this._getNextTurnHero();
    return true;
  }

  /**
   * AI selects a random alive enemy hero to send next. Valid only when pendingEnemySwitch.
   */
  selectNextEnemyHeroRandom() {
    if (!this.pendingEnemySwitch) return false;
    const alive = this.enemyTeam
      .map((h, i) => ({ hero: h, i }))
      .filter(({ hero }) => hero.alive);
    if (alive.length === 0) return false;
    const chosen = alive[Math.floor(Math.random() * alive.length)];
    this.enemyActiveIndex = chosen.i;
    this._rebuildTurnQueue();
    this.pendingEnemySwitch = false;
    this.currentTurnHero = this._getNextTurnHero();
    return true;
  }

  /** @returns {boolean} */
  isBattleOver() {
    return this.victorId !== null;
  }

  /** @returns {'player' | 'enemy' | null} */
  getVictor() {
    return this.victorId;
  }

  _checkVictory() {
    const playerAlive = this.playerTeam.filter((h) => h.alive).length;
    const enemyAlive = this.enemyTeam.filter((h) => h.alive).length;
    if (playerAlive === 0) this.victorId = 'enemy';
    else if (enemyAlive === 0) this.victorId = 'player';
  }
}
