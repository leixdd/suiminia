/**
 * Skills database. All entries are physical attacks (physical defense only).
 *
 * Skill damage formula (raw power before defense):
 *   (Attack + Skill Damage) + (Attack × Damage multiplier)
 *   = Attack × (1 + damageMultiplier) + skillDamage
 *
 * Final damage vs defender: apply defender's DEF (and guard/stagger) to this power
 * in the same way as basic attacks (e.g. max(MIN_DAMAGE, skillPower - effectiveDef)).
 *
 * @typedef {Object} Skill
 * @property {string} id - Unique id
 * @property {string} name - Display name
 * @property {string} [description] - Optional flavour text
 * @property {number} skillDamage - Flat damage added to ATK
 * @property {number} damageMultiplier - Extra ATK scaling (e.g. 0.2 = +20% of ATK)
 * @property {number} [hits] - Number of hits (default 1). The attack runs this many times in a loop (full damage each hit); stagger/ATB apply per hit when guarding.
 * @property {number | number[]} [mhdmphp] - Multiple hits damage modifier per hit (0..1). If number: first hit = 100%, subsequent hits = this value (e.g. 0.8 = 80%). If array: [mod hit1, mod hit2, ...] for full control (e.g. [1.0, 0.8, 0.3] = strong first, weaker follow-ups).
 */

/** Maximum number of skills a hero can have. */
export const MAX_SKILLS_PER_HERO = 4;

/** @type {Skill[]} */
export const SKILLS = [
  {
    id: 'basic_strike',
    name: 'Strike',
    description: 'A straightforward physical blow.',
    skillDamage: 2,
    damageMultiplier: 0,
    hits: 1,
  },
  {
    id: 'slash',
    name: 'Slash',
    description: 'A quick cutting attack.',
    skillDamage: 5,
    damageMultiplier: 0,
    hits: 1,
  },
  {
    id: 'heavy_swing',
    name: 'Heavy Swing',
    description: 'A slow, powerful strike.',
    skillDamage: 15,
    damageMultiplier: 0,
    hits: 1,
  },
  {
    id: 'power_strike',
    name: 'Power Strike',
    description: 'Channels strength into a single hit.',
    skillDamage: 0,
    damageMultiplier: 0,
    hits: 1,
  },
  {
    id: 'crush',
    name: 'Crush',
    description: 'Overwhelming physical impact.',
    skillDamage: 10,
    damageMultiplier: 0,
    hits: 1,
  },
  {
    id: 'barrage',
    name: 'Barrage',
    description: 'A flurry of physical strikes.',
    skillDamage: 3,
    damageMultiplier: 0,
    hits: 3,
    mhdmphp: [1.0, 0.8, 0.1],
  },
];

/**
 * Compute raw skill power (before defense) using the skill formula.
 * (Attack + Skill Damage) + (Attack × Damage multiplier)
 * @param {number} atk - Attacker's ATK stat
 * @param {Skill} skill - Skill from database
 * @returns {number} Raw power (use with DamageCalculator for final damage vs DEF)
 */
export function getSkillPower(atk, skill) {
  if (!skill) return atk;
  const flat = atk + (skill.skillDamage ?? 0);
  const scaled = atk * (skill.damageMultiplier ?? 0);
  return flat + scaled;
}

/**
 * Get the damage modifier for one hit in a multi-hit skill (mhdmphp).
 * @param {number} hitIndex - 0-based hit index
 * @param {number} hits - Total number of hits
 * @param {number | number[]} [mhdmphp] - Skill's mhdmphp (number or array)
 * @returns {number} Multiplier for this hit (1 = 100%)
 */
export function getMultiHitDamageModifier(hitIndex, hits, mhdmphp) {
  if (hits <= 1 || mhdmphp == null) return 1;
  if (typeof mhdmphp === 'number') {
    return hitIndex === 0 ? 1 : mhdmphp;
  }
  const arr = mhdmphp;
  return arr[hitIndex] ?? arr[arr.length - 1] ?? 1;
}

/**
 * Get a skill by id from the database.
 * @param {string} id
 * @returns {Skill | undefined}
 */
export function getSkillById(id) {
  return SKILLS.find((s) => s.id === id);
}
