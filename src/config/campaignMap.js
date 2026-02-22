/**
 * Campaign map configuration: nodes with coordinates, stage data, and clear sequence.
 *
 * Each node has:
 *   - id: unique string (used in clear sequence)
 *   - x, y: coordinates on the map (pixels)
 *   - stage: { name, description, enemyTeamId }
 *       - enemyTeamId must match an id in ENEMY_TEAMS (teamData.js)
 *
 * Clear sequence: a node is enabled only when every id in `requires` has been cleared.
 * Nodes with empty `requires` are available from the start.
 */

import { ENEMY_TEAMS } from './teamData.js';

/** Get enemy team config by id (for battle scene). */
export function getEnemyTeamById(teamId) {
  return ENEMY_TEAMS.find((t) => t.id === teamId) || null;
}

/**
 * Campaign nodes: order in array is display order; enablement is by `requires`.
 * Coordinates are in map space (MapScene uses a fixed map area).
 */
export const CAMPAIGN_NODES = [
  {
    id: 'stage-1',
    x: 120,
    y: 120,
    stage: {
      name: 'First Encounter',
      description: 'Face the Shadow Squad in the outskirts.',
      enemyTeamId: 'shadow',
    },
    requires: [],
  },
  {
    id: 'stage-2',
    x: 320,
    y: 100,
    stage: {
      name: 'Swift Blades',
      description: 'Fast foes block the path.',
      enemyTeamId: 'swift',
    },
    requires: ['stage-1'],
  },
  {
    id: 'stage-3',
    x: 520,
    y: 140,
    stage: {
      name: 'Titan Guard',
      description: 'Heavy defenders guard the gate.',
      enemyTeamId: 'titans',
    },
    requires: ['stage-2'],
  },
  {
    id: 'stage-4',
    x: 400,
    y: 280,
    stage: {
      name: 'Balance Corps',
      description: 'The final trial.',
      enemyTeamId: 'balanced',
    },
    requires: ['stage-3'],
  },
];
