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
  },
  {
    id: 'slash',
    name: 'Slash',
    description: 'A quick cutting attack.',
    skillDamage: 5,
    damageMultiplier: 0,
  },
  {
    id: 'heavy_swing',
    name: 'Heavy Swing',
    description: 'A slow, powerful strike.',
    skillDamage: 15,
    damageMultiplier: 0,
  },
  {
    id: 'power_strike',
    name: 'Power Strike',
    description: 'Channels strength into a single hit.',
    skillDamage: 0,
    damageMultiplier: 0,
  },
  {
    id: 'crush',
    name: 'Crush',
    description: 'Overwhelming physical impact.',
    skillDamage: 10,
    damageMultiplier: 0,
  },
  {
    id: 'barrage',
    name: 'Barrage',
    description: 'A flurry of physical strikes.',
    skillDamage: 3,
    damageMultiplier: 0,
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
 * Get a skill by id from the database.
 * @param {string} id
 * @returns {Skill | undefined}
 */
export function getSkillById(id) {
  return SKILLS.find((s) => s.id === id);
}
