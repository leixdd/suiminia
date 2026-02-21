/**
 * Shared team data for Lobby (opponent list, player party) and Battle.
 * Each hero config: { name, atk, def, spd, maxHp? }
 */

export const DEFAULT_PLAYER_PARTY = [
  { name: 'Alpha', atk: 25, def: 5, spd: 10, maxHp: 100 },
  { name: 'Beta', atk: 22, def: 8, spd: 7, maxHp: 100 },
  { name: 'Gamma', atk: 20, def: 10, spd: 5, maxHp: 100 },
];

/** Opponent teams the player can choose to fight. */
export const ENEMY_TEAMS = [
  {
    id: 'shadow',
    name: 'Shadow Squad',
    heroes: [
      { name: 'Shadow', atk: 20, def: 8, spd: 4, maxHp: 100 },
      { name: 'Blade', atk: 24, def: 6, spd: 6, maxHp: 100 },
      { name: 'Fang', atk: 18, def: 9, spd: 9, maxHp: 100 },
    ],
  },
  {
    id: 'titans',
    name: 'Titan Guard',
    heroes: [
      { name: 'Bulk', atk: 28, def: 12, spd: 3, maxHp: 100 },
      { name: 'Stone', atk: 22, def: 14, spd: 4, maxHp: 100 },
      { name: 'Iron', atk: 20, def: 11, spd: 5, maxHp: 100 },
    ],
  },
  {
    id: 'swift',
    name: 'Swift Blades',
    heroes: [
      { name: 'Dash', atk: 18, def: 4, spd: 14, maxHp: 100 },
      { name: 'Rush', atk: 20, def: 5, spd: 12, maxHp: 100 },
      { name: 'Flash', atk: 19, def: 6, spd: 11, maxHp: 100 },
    ],
  },
  {
    id: 'balanced',
    name: 'Balance Corps',
    heroes: [
      { name: 'Ace', atk: 22, def: 8, spd: 8, maxHp: 100 },
      { name: 'Prime', atk: 21, def: 9, spd: 7, maxHp: 100 },
      { name: 'Core', atk: 23, def: 7, spd: 9, maxHp: 100 },
    ],
  },
];
