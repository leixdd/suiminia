/**
 * Shared team data for Lobby and Battle.
 * Player hero: { name, atk, def, spd, maxHp? }
 * Enemy hero: { name, atk, def, spd, maxHp?, behavior?, actionRatio? }
 *   - behavior: 'aggressive' | 'defensive' | 'balanced' (default 'aggressive')
 *   - actionRatio: { attack?: number, guard?: number } for AI probability
 */

export const DEFAULT_PLAYER_PARTY = [
  { name: 'Alpha', atk: 25, def: 5, spd: 10, maxHp: 100 },
  { name: 'Beta', atk: 22, def: 8, spd: 7, maxHp: 100 },
  { name: 'Gamma', atk: 20, def: 10, spd: 5, maxHp: 100 },
];

/** Enemy teams. Each hero can have its own behavior and actionRatio for campaign/story flexibility. */
export const ENEMY_TEAMS = [
  {
    id: 'shadow',
    name: 'Shadow Squad',
    heroes: [
      { name: 'Shadow', atk: 20, def: 8, spd: 4, maxHp: 100, behavior: 'aggressive' },
      { name: 'Blade', atk: 24, def: 6, spd: 6, maxHp: 100, behavior: 'aggressive' },
      { name: 'Fang', atk: 18, def: 9, spd: 9, maxHp: 100, behavior: 'aggressive' },
    ],
  },
  {
    id: 'titans',
    name: 'Titan Guard',
    heroes: [
      { name: 'Bulk', atk: 28, def: 12, spd: 3, maxHp: 100, behavior: 'defensive', actionRatio: { attack: 0.4, guard: 0.6 } },
      { name: 'Stone', atk: 22, def: 14, spd: 4, maxHp: 100, behavior: 'defensive', actionRatio: { attack: 0.3, guard: 0.7 } },
      { name: 'Iron', atk: 20, def: 11, spd: 5, maxHp: 100, behavior: 'balanced', actionRatio: { attack: 0.5, guard: 0.5 } },
    ],
  },
  {
    id: 'swift',
    name: 'Swift Blades',
    heroes: [
      { name: 'Dash', atk: 18, def: 4, spd: 14, maxHp: 100, behavior: 'aggressive' },
      { name: 'Rush', atk: 20, def: 5, spd: 12, maxHp: 100, behavior: 'aggressive' },
      { name: 'Flash', atk: 19, def: 6, spd: 11, maxHp: 100, behavior: 'aggressive' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balance Corps',
    heroes: [
      { name: 'Ace', atk: 22, def: 8, spd: 8, maxHp: 100, behavior: 'balanced', actionRatio: { attack: 0.5, guard: 0.5 } },
      { name: 'Prime', atk: 21, def: 9, spd: 7, maxHp: 100, behavior: 'balanced', actionRatio: { attack: 0.5, guard: 0.5 } },
      { name: 'Core', atk: 23, def: 7, spd: 9, maxHp: 100, behavior: 'balanced', actionRatio: { attack: 0.5, guard: 0.5 } },
    ],
  },
];
