/**
 * MapScene: campaign map with nodes. Nodes are cleared sequentially;
 * a node is enabled only when all nodes in its `requires` list are cleared.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_FONT } from '../config/constants.js';
import { CAMPAIGN_NODES, getEnemyTeamById } from '../config/campaignMap.js';
import { DEFAULT_PLAYER_PARTY } from '../config/teamData.js';

const REGISTRY_CAMPAIGN_CLEARED = 'campaignCleared';
const PANEL_PAD = 24;
const NODE_RADIUS = 32;
const NODE_COLOR_ENABLED = 0x3498db;
const NODE_COLOR_DISABLED = 0x3a3a5c;
const NODE_COLOR_CLEARED = 0x2ecc71;
const NODE_STROKE = 0x1e2a38;
const FONT_SIZE_TITLE = 14;
const FONT_SIZE_NODE = 9;
const FONT_SIZE_DESC = 8;
const DEPTH_BG = 0;
const DEPTH_LINES = 1;
const DEPTH_NODES = 10;
const DEPTH_UI = 20;

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Map' });
  }

  create() {
    const cleared = this.registry.get(REGISTRY_CAMPAIGN_CLEARED) || [];
    this.clearedSet = new Set(Array.isArray(cleared) ? cleared : []);

    this._buildTitleAndBack();
    this._drawConnections();
    this._buildNodes();
  }

  _buildTitleAndBack() {
    this.add
      .text(GAME_WIDTH / 2, PANEL_PAD + 10, 'Campaign', {
        fontSize: FONT_SIZE_TITLE,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_UI);

    const backX = GAME_WIDTH - 80;
    const backY = PANEL_PAD + 14;
    const backZone = this.add
      .rectangle(backX, backY, 70, 28, 0x0d1117, 0.95)
      .setStrokeStyle(2, 0x3498db)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_UI);
    this.add
      .text(backX, backY, 'Back', {
        fontSize: FONT_SIZE_DESC,
        fontFamily: GAME_FONT,
        color: '#e0e0e0',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_UI + 1);
    backZone.on('pointerdown', () => this.scene.start('Lobby'));
    backZone.on('pointerover', () => backZone.setStrokeStyle(2, 0xf1c40f));
    backZone.on('pointerout', () => backZone.setStrokeStyle(2, 0x3498db));
  }

  _drawConnections() {
    const g = this.add.graphics().setDepth(DEPTH_LINES);
    CAMPAIGN_NODES.forEach((node) => {
      if (!node.requires || node.requires.length === 0) return;
      node.requires.forEach((reqId) => {
        const from = CAMPAIGN_NODES.find((n) => n.id === reqId);
        if (!from) return;
        g.lineStyle(2, 0x3a3a5c, 0.8);
        g.beginPath();
        g.moveTo(from.x, from.y);
        g.lineTo(node.x, node.y);
        g.strokePath();
      });
    });
  }

  _isNodeEnabled(node) {
    if (this.clearedSet.has(node.id)) return false; // already cleared, no need to enable for play
    return node.requires.every((id) => this.clearedSet.has(id));
  }

  _buildNodes() {
    this.nodeGraphics = [];
    CAMPAIGN_NODES.forEach((node) => {
      const cleared = this.clearedSet.has(node.id);
      const enabled = this._isNodeEnabled(node);

      const color = cleared ? NODE_COLOR_CLEARED : enabled ? NODE_COLOR_ENABLED : NODE_COLOR_DISABLED;
      const circle = this.add
        .circle(node.x, node.y, NODE_RADIUS, color, 0.95)
        .setStrokeStyle(2, NODE_STROKE)
        .setDepth(DEPTH_NODES);
      this.nodeGraphics.push(circle);

      const label = this.add
        .text(node.x, node.y - 6, node.stage.name, {
          fontSize: FONT_SIZE_NODE,
          fontFamily: GAME_FONT,
          color: '#e0e0e0',
          align: 'center',
        })
        .setOrigin(0.5, 0.5)
        .setWordWrapWidth(NODE_RADIUS * 2.4)
        .setDepth(DEPTH_NODES + 1);
      this.nodeGraphics.push(label);

      if (cleared) {
        const check = this.add
          .text(node.x, node.y + 10, '\u2713', {
            fontSize: 12,
            fontFamily: GAME_FONT,
            color: '#1a1a2e',
          })
          .setOrigin(0.5, 0.5)
          .setDepth(DEPTH_NODES + 1);
        this.nodeGraphics.push(check);
      }

      if (enabled) {
        const zone = this.add
          .circle(node.x, node.y, NODE_RADIUS, 0x000000, 0)
          .setInteractive({ useHandCursor: true })
          .setDepth(DEPTH_NODES + 2);
        zone.setData('node', node);
        zone.on('pointerdown', () => this._onNodeClicked(node));
        zone.on('pointerover', () => circle.setStrokeStyle(2, 0xf1c40f));
        zone.on('pointerout', () => circle.setStrokeStyle(2, NODE_STROKE));
        this.nodeGraphics.push(zone);
      }
    });
  }

  _onNodeClicked(node) {
    const enemyTeam = getEnemyTeamById(node.stage.enemyTeamId);
    if (!enemyTeam) return;
    const playerParty = this.registry.get('campaignPlayerParty') || DEFAULT_PLAYER_PARTY.slice(0, 3).map((h) => ({ ...h }));
    this.scene.start('Battle', {
      playerParty: Array.isArray(playerParty) ? playerParty : DEFAULT_PLAYER_PARTY.slice(0, 3).map((h) => ({ ...h })),
      enemyTeam,
      returnScene: 'Map',
      returnData: { campaignNodeId: node.id },
    });
  }
}
