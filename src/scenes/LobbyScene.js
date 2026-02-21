/**
 * LobbyScene: choose opponent team (left 8/12) and view current party (right 4/12).
 * Left: list of teams to fight; right: party list + menu to see full stats.
 */
import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_FONT,
  TEAM_SIZE,
} from '../config/constants.js';
import { DEFAULT_PLAYER_PARTY, ENEMY_TEAMS } from '../config/teamData.js';

const PANEL_PAD = 24;
const LEFT_RATIO = 8 / 12;
const RIGHT_RATIO = 4 / 12;
const LEFT_W = GAME_WIDTH * LEFT_RATIO - PANEL_PAD * 2;
const RIGHT_W = GAME_WIDTH * RIGHT_RATIO - PANEL_PAD;
const LEFT_CX = (GAME_WIDTH * LEFT_RATIO) / 2;
const RIGHT_CX = GAME_WIDTH * LEFT_RATIO + (GAME_WIDTH * RIGHT_RATIO) / 2;
const ROW_H = 36;
const ROW_GAP = 8;
const FONT_SIZE_HEADER = 12;
const FONT_SIZE_ROW = 10;
const FONT_SIZE_STATS = 9;
const PANEL_FILL = 0x1e2a38;
const PANEL_STROKE = 0x3498db;
const ROW_FILL = 0x0d1117;
const ROW_STROKE = 0x3a3a5c;
const DEPTH_PANEL = 10;
const DEPTH_OVERLAY = 100;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Lobby' });
  }

  create() {
    this.playerParty = DEFAULT_PLAYER_PARTY.map((h, i) => ({ ...h }));
    this.selectedEnemyTeam = null;
    this.detailsVisible = false;

    this._buildLeftPanel();
    this._buildRightPanel();
    this._buildDetailsOverlay();
  }

  _buildLeftPanel() {
    const top = PANEL_PAD + 40;
    this.add
      .text(LEFT_CX, PANEL_PAD + 12, 'Choose opponent', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: '#3498db',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_PANEL);

    this.enemyRowZones = [];
    ENEMY_TEAMS.forEach((team, i) => {
      const y = top + i * (ROW_H + ROW_GAP) + ROW_H / 2;
      const bg = this.add
        .rectangle(LEFT_CX, y, LEFT_W - 32, ROW_H, ROW_FILL, 0.95)
        .setStrokeStyle(1, ROW_STROKE)
        .setDepth(DEPTH_PANEL);
      const label = this.add
        .text(LEFT_CX - LEFT_W / 2 + 20, y, team.name, {
          fontSize: FONT_SIZE_ROW,
          fontFamily: GAME_FONT,
          color: '#e0e0e0',
        })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH_PANEL + 1);
      const zone = this.add
        .rectangle(LEFT_CX, y, LEFT_W - 32, ROW_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_PANEL + 2);
      zone.on('pointerdown', () => this._selectEnemyTeam(team, bg, i));
      zone.on('pointerover', () => bg.setStrokeStyle(2, 0x3498db));
      zone.on('pointerout', () => {
        if (this.selectedEnemyTeam?.id !== team.id) bg.setStrokeStyle(1, ROW_STROKE);
      });
      this.enemyRowZones.push({ team, bg, label, zone });
    });

    this.fightBtn = this.add
      .text(LEFT_CX, top + ENEMY_TEAMS.length * (ROW_H + ROW_GAP) + 40, 'Fight!', {
        fontSize: FONT_SIZE_ROW,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_PANEL + 1)
      .setVisible(false);
    this.fightZone = this.add
      .rectangle(this.fightBtn.x, this.fightBtn.y, 120, 32, 0x0d1117, 0.95)
      .setStrokeStyle(2, 0x3498db)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_PANEL)
      .setVisible(false);
    this.fightZone.on('pointerdown', () => this._startBattle());
    this.fightZone.on('pointerover', () => this.fightZone.setStrokeStyle(2, 0xf1c40f));
    this.fightZone.on('pointerout', () => this.fightZone.setStrokeStyle(2, 0x3498db));
  }

  _selectEnemyTeam(team, bg, index) {
    this.selectedEnemyTeam = team;
    this.enemyRowZones.forEach((r, i) => {
      r.bg.setStrokeStyle(i === index ? 2 : 1, i === index ? 0x3498db : ROW_STROKE);
    });
    this.fightBtn.setVisible(true);
    this.fightZone.setVisible(true);
  }

  _buildRightPanel() {
    const top = PANEL_PAD + 40;
    this.add
      .text(RIGHT_CX, PANEL_PAD + 12, 'Your party', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: '#3498db',
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_PANEL);

    this.partyRows = [];
    const rowW = RIGHT_W - 24;
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = top + i * (ROW_H + ROW_GAP) + ROW_H / 2;
      const hero = this.playerParty[i];
      const nameText = this.add
        .text(RIGHT_CX - rowW / 2 + 12, y - ROW_H / 2 + 6, hero.name, {
          fontSize: FONT_SIZE_ROW,
          fontFamily: GAME_FONT,
          color: '#e0e0e0',
        })
        .setOrigin(0, 0)
        .setDepth(DEPTH_PANEL + 1);
      const bg = this.add
        .rectangle(RIGHT_CX, y, rowW, ROW_H, ROW_FILL, 0.95)
        .setStrokeStyle(1, ROW_STROKE)
        .setDepth(DEPTH_PANEL);
      this.partyRows.push({ bg, nameText, hero });
    }

    const detailsY = top + TEAM_SIZE * (ROW_H + ROW_GAP) + 24;
    this.detailsBtn = this.add
      .text(RIGHT_CX, detailsY, 'View full details', {
        fontSize: 8,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_PANEL + 1);
    this.detailsZone = this.add
      .rectangle(RIGHT_CX, detailsY, 140, 28, 0x0d1117, 0.95)
      .setStrokeStyle(1, ROW_STROKE)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_PANEL);
    this.detailsZone.on('pointerdown', () => this._toggleDetails());
  }

  _buildDetailsOverlay() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.detailsOverlay = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setVisible(false)
      .setDepth(DEPTH_OVERLAY);
    this.detailsOverlay.on('pointerdown', () => this._toggleDetails());

    const panelW = 320;
    const panelH = 220;
    this.detailsPanel = this.add
      .rectangle(cx, cy, panelW, panelH, PANEL_FILL, 0.98)
      .setStrokeStyle(3, PANEL_STROKE)
      .setVisible(false)
      .setDepth(DEPTH_OVERLAY + 1);

    this.detailsTitle = this.add
      .text(cx, cy - panelH / 2 + 20, 'Party stats', {
        fontSize: FONT_SIZE_HEADER,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setDepth(DEPTH_OVERLAY + 2);

    const lineH = 36;
    const startY = cy - panelH / 2 + 50;
    this.detailsTexts = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = startY + i * lineH;
      const nameT = this.add
        .text(cx - panelW / 2 + 16, y, '', {
          fontSize: FONT_SIZE_ROW,
          fontFamily: GAME_FONT,
          color: '#e0e0e0',
        })
        .setOrigin(0, 0)
        .setVisible(false)
        .setDepth(DEPTH_OVERLAY + 2);
      const statsT = this.add
        .text(cx - panelW / 2 + 16, y + 14, '', {
          fontSize: FONT_SIZE_STATS,
          fontFamily: GAME_FONT,
          color: '#b0b0b0',
        })
        .setOrigin(0, 0)
        .setVisible(false)
        .setDepth(DEPTH_OVERLAY + 2);
      this.detailsTexts.push({ nameT, statsT });
    }

    this.detailsClose = this.add
      .text(cx, cy + panelH / 2 - 28, 'Close', {
        fontSize: 8,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setDepth(DEPTH_OVERLAY + 2);
    this.detailsCloseZone = this.add
      .rectangle(cx, this.detailsClose.y, 80, 24, 0x0d1117, 0.95)
      .setStrokeStyle(1, ROW_STROKE)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(DEPTH_OVERLAY + 1);
    this.detailsCloseZone.on('pointerdown', () => this._toggleDetails());
  }

  _toggleDetails() {
    this.detailsVisible = !this.detailsVisible;
    this.detailsOverlay.setVisible(this.detailsVisible);
    this.detailsPanel.setVisible(this.detailsVisible);
    this.detailsTitle.setVisible(this.detailsVisible);
    this.detailsClose.setVisible(this.detailsVisible);
    this.detailsCloseZone.setVisible(this.detailsVisible);
    if (this.detailsVisible) {
      this.playerParty.forEach((hero, i) => {
        const row = this.detailsTexts[i];
        row.nameT.setText(hero.name).setVisible(true);
        row.statsT
          .setText(`ATK ${hero.atk}  DEF ${hero.def}  SPD ${hero.spd}  HP ${hero.maxHp}`)
          .setVisible(true);
      });
    } else {
      this.detailsTexts.forEach(({ nameT, statsT }) => {
        nameT.setVisible(false);
        statsT.setVisible(false);
      });
    }
  }

  _startBattle() {
    if (!this.selectedEnemyTeam) return;
    this.scene.start('Battle', {
      playerParty: this.playerParty,
      enemyTeam: this.selectedEnemyTeam,
    });
  }
}
