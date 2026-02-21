/**
 * BattleScene: Pokemon-style team battle. 3 heroes per side, one active at a time.
 * When active dies, player chooses next hero; AI picks randomly.
 */
import Phaser from 'phaser';
import { Hero } from '../entities/Hero.js';
import { HeroUI } from '../entities/HeroUI.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { getAIAction } from '../battle/Player2AI.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BATTLE_PADDING,
  CARD_WIDTH,
  CARD_HEIGHT,
  TEAM_SIZE,
  COMMAND_WINDOW_FONT,
  COMMAND_WINDOW_FONT_SIZE,
  FONT_SIZE_DAMAGE_POP,
  FONT_SIZE_DEBUG_UI,
  FONT_SIZE_VICTORY,
  GAME_FONT,
} from '../config/constants.js';

const AI_TURN_DELAY_MS = 600;
const VICTORY_DELAY_MS = 1500;
const ENEMY_SWITCH_DELAY_MS = 800;

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function createTeamHeroes(prefix, names, stats) {
  return names.map((name, i) => new Hero({
    id: `${prefix}${i + 1}`,
    name,
    atk: stats[i].atk,
    def: stats[i].def,
    spd: stats[i].spd,
    maxHp: stats[i].maxHp ?? 100,
  }));
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Battle' });
  }

  create() {
    const playerTeam = createTeamHeroes('player', ['Alpha', 'Beta', 'Gamma'], [
      { atk: 25, def: 5, spd: 10, maxHp: 100 },
      { atk: 22, def: 8, spd: 7, maxHp: 100 },
      { atk: 20, def: 10, spd: 5, maxHp: 100 },
    ]);
    const enemyTeam = createTeamHeroes('enemy', ['Shadow', 'Blade', 'Fang'], [
      { atk: 20, def: 8, spd: 4, maxHp: 100 },
      { atk: 24, def: 6, spd: 6, maxHp: 100 },
      { atk: 18, def: 9, spd: 9, maxHp: 100 },
    ]);

    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.engine = new BattleEngine(playerTeam, enemyTeam);

    const centerY = GAME_HEIGHT / 2;
    const leftX = BATTLE_PADDING + CARD_WIDTH / 2;
    const rightX = GAME_WIDTH - BATTLE_PADDING - CARD_WIDTH / 2;

    // Active hero cards (one per side)
    this.playerCard = this._makeHeroCard(leftX, centerY, 'player', 'hero-placeholder');
    this.enemyCard = this._makeHeroCard(rightX, centerY, 'enemy', 'hero-placeholder-p2');

    // Hero UI for active heroes only (rebind on switch)
    this.playerActiveUI = new HeroUI(this, leftX, centerY, this.engine.getPlayerActive());
    this.enemyActiveUI = new HeroUI(this, rightX, centerY, this.engine.getEnemyActive());

    // Team panels: 3 heroes per side (name + HP), for display and player switch selection
    const teamPanelWidth = 140;
    const teamRowHeight = 28;
    const teamPanelHeight = TEAM_SIZE * teamRowHeight + 16;
    const playerPanelX = leftX - CARD_WIDTH / 2 - teamPanelWidth / 2 - 20;
    const enemyPanelX = rightX + CARD_WIDTH / 2 + teamPanelWidth / 2 + 20;
    const panelY = centerY;

    this.playerTeamRows = [];
    this.enemyTeamRows = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = panelY - teamPanelHeight / 2 + 16 + i * teamRowHeight + teamRowHeight / 2;
      const pr = this._addTeamRow(playerPanelX, y, playerTeam[i], i, true);
      this.playerTeamRows.push(pr);
      const er = this._addTeamRow(enemyPanelX, y, enemyTeam[i], i, false);
      this.enemyTeamRows.push(er);
    }

    // --- "Choose next hero" window (keyboard + mouse) ---
    const switchDepth = 400;
    const switchPanelW = 320;
    const switchPanelH = 200;
    const switchPanelX = GAME_WIDTH / 2;
    const switchPanelY = GAME_HEIGHT / 2;
    const rowH = 36;
    const rowStartY = switchPanelY - switchPanelH / 2 + 44;

    this.switchOverlay = this.add
      .rectangle(GAME_WIDTH / 2, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setVisible(false)
      .setDepth(switchDepth);

    this.switchPanel = this.add
      .rectangle(switchPanelX, switchPanelY, switchPanelW, switchPanelH, 0x1e2a38, 0.98)
      .setStrokeStyle(3, 0x3498db)
      .setVisible(false)
      .setDepth(switchDepth + 1);

    this.switchTitle = this.add
      .text(switchPanelX, switchPanelY - switchPanelH / 2 + 22, 'Choose next hero!', {
        fontSize: 12,
        fontFamily: GAME_FONT,
        color: '#f1c40f',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(switchDepth + 2);

    this.switchOptionRows = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      const y = rowStartY + i * rowH + rowH / 2;
      const row = this._addSwitchWindowRow(switchPanelX, y, i);
      this.switchOptionRows.push(row);
    }

    this.switchHint = this.add
      .text(switchPanelX, switchPanelY + switchPanelH / 2 - 22, '1 / 2 / 3 or click  ·  \u2191\u2193 + Enter', {
        fontSize: 8,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(switchDepth + 2);

    /** Keyboard-selected index in switch window (0..2); only alive heroes are valid */
    this.switchSelectedIndex = 0;

    // Victory text
    this.victoryText = this.add
      .text(GAME_WIDTH / 2, 60, '', { fontSize: FONT_SIZE_VICTORY, fontFamily: GAME_FONT, color: '#f1c40f' })
      .setOrigin(0.5)
      .setVisible(false);

    // Bottom bar
    const uiDepth = 500;
    const barHeight = 56;
    const bottomBarY = GAME_HEIGHT - barHeight / 2;
    const feedbackWidth = (GAME_WIDTH * 4) / 12;
    const commandWidth = (GAME_WIDTH * 8) / 12;
    const feedbackCenterX = feedbackWidth / 2;
    const commandCenterX = GAME_WIDTH * (4 / 12) + commandWidth / 2;
    const gap = 4;

    const debugDepth = 450;
    const debugHeight = 72;
    const debugWidth = GAME_WIDTH - 32;
    const debugCenterX = GAME_WIDTH / 2;
    const debugY = bottomBarY - barHeight / 2 - debugHeight / 2 - 8;
    const debugContentTop = debugY - debugHeight / 2 + 18;
    const debugContentHeight = debugHeight - 24;
    const debugLineHeight = 14;
    const debugMaxLines = 32;
    const debugPadding = 8;

    this.add
      .rectangle(debugCenterX, debugY, debugWidth, debugHeight, 0x0d1117, 0.95)
      .setStrokeStyle(1, 0x30363d)
      .setDepth(debugDepth);
    this.add
      .text(debugCenterX, debugY - debugHeight / 2 + 4, 'Damage (debug)', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#8b949e',
      })
      .setOrigin(0.5, 0)
      .setDepth(debugDepth + 1);

    this.debugLogEntries = [];
    this.debugLogScroll = 0;
    this.debugLogContentHeight = 0;
    this.debugLogContainer = this.add.container(
      debugCenterX - debugWidth / 2 + debugPadding,
      debugContentTop
    ).setDepth(debugDepth + 1);
    const maskGraphics = this.make.graphics({ add: false });
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(
      debugCenterX - debugWidth / 2 + debugPadding,
      debugContentTop - 2,
      debugWidth - debugPadding * 2,
      debugContentHeight + 4
    );
    this.debugLogContainer.setMask(maskGraphics.createGeometryMask());
    this.debugLogPanelBounds = {
      left: debugCenterX - debugWidth / 2,
      right: debugCenterX + debugWidth / 2,
      top: debugY - debugHeight / 2,
      bottom: debugY + debugHeight / 2,
    };
    this.debugContentTop = debugContentTop;
    this.debugContentHeight = debugContentHeight;
    this.debugLineHeight = debugLineHeight;
    this.debugMaxLines = debugMaxLines;

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.debugLogPanelBounds) return;
      const { left, right, top, bottom } = this.debugLogPanelBounds;
      if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) {
        const maxScroll = Math.max(0, this.debugLogContentHeight - debugContentHeight);
        this.debugLogScroll = Phaser.Math.Clamp(this.debugLogScroll + deltaY, 0, maxScroll);
        this._updateDebugLogScroll();
      }
    });

    this.add
      .rectangle(feedbackCenterX, bottomBarY, feedbackWidth - gap / 2, barHeight, 0x2c3e50, 0.95)
      .setStrokeStyle(2, 0x5d6d7e)
      .setDepth(uiDepth);
    this.instructionText = this.add
      .text(feedbackCenterX, bottomBarY - 14, 'Waiting for a turn.', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: feedbackWidth - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(uiDepth + 1);
    this.instructionSubtext = this.add
      .text(feedbackCenterX, bottomBarY + 4, '', {
        fontSize: FONT_SIZE_DEBUG_UI,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: feedbackWidth - 24 },
      })
      .setOrigin(0.5, 0)
      .setDepth(uiDepth + 1);

    const btnW = 100;
    const btnH = 40;
    const btnGap = 16;
    const attackX = commandCenterX + btnGap / 2 + btnW / 2;
    const guardX = commandCenterX - btnGap / 2 - btnW / 2;
    this.guardBtn = this.add
      .rectangle(guardX, bottomBarY, btnW, btnH, 0x3498db)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.guardBtnText = this.add
      .text(guardX, bottomBarY, 'Guard', { fontSize: COMMAND_WINDOW_FONT_SIZE, fontFamily: COMMAND_WINDOW_FONT, color: '#fff' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.attackBtn = this.add
      .rectangle(attackX, bottomBarY, btnW, btnH, 0x2ecc71)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(uiDepth + 1);
    this.attackBtnText = this.add
      .text(attackX, bottomBarY, 'Attack', { fontSize: COMMAND_WINDOW_FONT_SIZE, fontFamily: COMMAND_WINDOW_FONT, color: '#fff' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(uiDepth + 1);

    this.guardBtn.on('pointerdown', () => this._onGuardClicked());
    this.guardBtn.on('pointerover', () => this.guardBtn.setAlpha(0.9));
    this.guardBtn.on('pointerout', () => this.guardBtn.setAlpha(1));
    this.attackBtn.on('pointerdown', () => this._onAttackClicked());
    this.attackBtn.on('pointerover', () => this.attackBtn.setAlpha(0.9));
    this.attackBtn.on('pointerout', () => this.attackBtn.setAlpha(1));

    this._aiScheduled = false;
    this._victoryScheduled = false;
    this._enemySwitchScheduled = false;

    // Keyboard for switch window: 1/2/3 and arrows + Enter
    this.input.keyboard.on('keydown', this._onSwitchWindowKeyDown, this);
  }

  _addSwitchWindowRow(centerX, y, index) {
    const rowW = 260;
    const rowH = 28;
    const bg = this.add
      .rectangle(centerX, y, rowW, rowH, 0x0d1117, 0.95)
      .setStrokeStyle(1, 0x3a3a5c)
      .setVisible(false)
      .setDepth(402);
    const keyText = this.add
      .text(centerX - rowW / 2 + 14, y, `[${index + 1}]`, { fontSize: 10, fontFamily: GAME_FONT, color: '#8b949e' })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(403);
    const nameText = this.add
      .text(centerX - rowW / 2 + 50, y, '', { fontSize: 10, fontFamily: GAME_FONT, color: '#e0e0e0' })
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(403);
    const hpText = this.add
      .text(centerX + rowW / 2 - 14, y, '', { fontSize: 10, fontFamily: GAME_FONT, color: '#aaa' })
      .setOrigin(1, 0.5)
      .setVisible(false)
      .setDepth(403);
    const zone = this.add
      .rectangle(centerX, y, rowW, rowH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(404);
    return { bg, keyText, nameText, hpText, zone, index };
  }

  _addTeamRow(x, y, hero, index, isPlayer) {
    const bg = this.add
      .rectangle(x, y, 130, 24, 0x1a1a2e, 0.9)
      .setStrokeStyle(1, 0x3a3a5c)
      .setDepth(350);
    const nameText = this.add
      .text(x - 60, y, hero.name, { fontSize: 8, fontFamily: GAME_FONT, color: '#ccc' })
      .setOrigin(0, 0.5)
      .setDepth(351);
    const hpText = this.add
      .text(x + 55, y, `${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`, { fontSize: 8, fontFamily: GAME_FONT, color: '#aaa' })
      .setOrigin(1, 0.5)
      .setDepth(351);
    const zone = this.add
      .rectangle(x, y, 130, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: isPlayer })
      .setDepth(352);
    return { bg, nameText, hpText, zone, hero, index, isPlayer };
  }

  update() {
    if (this.engine.isBattleOver()) {
      this._syncBars();
      this._syncTeamPanels();
      if (!this._victoryScheduled) {
        this._victoryScheduled = true;
        this.time.delayedCall(VICTORY_DELAY_MS, () => this._showVictory());
      }
      return;
    }

    // Enemy switch: AI picks next hero after short delay
    if (this.engine.pendingEnemySwitch && !this._enemySwitchScheduled) {
      this._enemySwitchScheduled = true;
      this.time.delayedCall(ENEMY_SWITCH_DELAY_MS, () => {
        this.engine.selectNextEnemyHeroRandom();
        this.enemyActiveUI.setHero(this.engine.getEnemyActive());
        this._enemySwitchScheduled = false;
      });
      return;
    }

    // Player switch: show window (keyboard + mouse)
    if (this.engine.pendingPlayerSwitch) {
      this._showSwitchWindow();
      this._syncSwitchWindowContent();
      this._syncTeamPanels();
      return;
    }
    this._hideSwitchWindow();

    this.engine.tick();
    this.playerActiveUI.setHero(this.engine.getPlayerActive());
    this.enemyActiveUI.setHero(this.engine.getEnemyActive());
    this._syncBars();
    this._syncTeamPanels();
    this._updateAttackButtonVisibility();
    this._updateTurnInstructions();

    const current = this.engine.currentTurnHero;
    const isEnemyTurn = current && this.enemyTeam.includes(current);
    if (isEnemyTurn && !this._aiScheduled) {
      this._aiScheduled = true;
      this.time.delayedCall(AI_TURN_DELAY_MS, () => {
        this._executeAI();
        this._aiScheduled = false;
      });
    }
  }

  _makeHeroCard(x, y, side, textureKey) {
    const card = this.add
      .image(x, y, textureKey)
      .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .setData('side', side);
    card.on('pointerover', () => card.setTint(0xcccccc));
    card.on('pointerout', () => card.clearTint());
    return card;
  }

  _syncBars() {
    this.playerActiveUI.sync();
    this.enemyActiveUI.sync();
    const pActive = this.engine.getPlayerActive();
    const eActive = this.engine.getEnemyActive();
    this.playerCard.setAlpha(pActive.alive ? 1 : 0.4);
    this.enemyCard.setAlpha(eActive.alive ? 1 : 0.4);
  }

  _syncTeamPanels() {
    const pActive = this.engine.getPlayerActive();
    const eActive = this.engine.getEnemyActive();
    for (const row of this.playerTeamRows) {
      row.nameText.setText(row.hero.name);
      row.hpText.setText(`${fmtNum(row.hero.currentHp)}/${fmtNum(row.hero.maxHp)}`);
      row.nameText.setColor(row.hero.alive ? '#eee' : '#666');
      row.hpText.setColor(row.hero.alive ? '#aaa' : '#666');
      const isActive = row.hero === pActive;
      row.bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0x3498db : 0x3a3a5c);
      row.zone.off('pointerdown');
      if (this.engine.pendingPlayerSwitch && row.hero.alive) {
        row.zone.on('pointerdown', () => this._onTeamRowClicked(row.index, true));
      }
    }
    for (const row of this.enemyTeamRows) {
      row.nameText.setText(row.hero.name);
      row.hpText.setText(`${fmtNum(row.hero.currentHp)}/${fmtNum(row.hero.maxHp)}`);
      row.nameText.setColor(row.hero.alive ? '#eee' : '#666');
      row.hpText.setColor(row.hero.alive ? '#aaa' : '#666');
      const isActive = row.hero === eActive;
      row.bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0xe74c3c : 0x3a3a5c);
    }
  }

  _onTeamRowClicked(index, isPlayer) {
    if (!isPlayer || !this.engine.pendingPlayerSwitch) return;
    if (this.engine.selectNextPlayerHero(index)) {
      this.playerActiveUI.setHero(this.engine.getPlayerActive());
    }
  }

  _showSwitchWindow() {
    this.switchOverlay.setVisible(true);
    this.switchPanel.setVisible(true);
    this.switchTitle.setVisible(true);
    this.switchHint.setVisible(true);
    const aliveIndices = this.playerTeam.map((h, i) => ({ hero: h, i })).filter(({ hero }) => hero.alive).map(({ i }) => i);
    this.switchSelectedIndex = aliveIndices.length > 0 ? aliveIndices[0] : 0;
    for (const row of this.switchOptionRows) {
      row.bg.setVisible(true);
      row.keyText.setVisible(true);
      row.nameText.setVisible(true);
      row.hpText.setVisible(true);
      row.zone.setVisible(true);
      row.zone.removeAllListeners();
      row.zone.on('pointerdown', () => this._onSwitchWindowRowClicked(row.index));
      row.zone.on('pointerover', () => { this.switchSelectedIndex = row.index; });
    }
  }

  _hideSwitchWindow() {
    this.switchOverlay.setVisible(false);
    this.switchPanel.setVisible(false);
    this.switchTitle.setVisible(false);
    this.switchHint.setVisible(false);
    for (const row of this.switchOptionRows) {
      row.bg.setVisible(false);
      row.keyText.setVisible(false);
      row.nameText.setVisible(false);
      row.hpText.setVisible(false);
      row.zone.setVisible(false);
    }
  }

  _syncSwitchWindowContent() {
    for (const row of this.switchOptionRows) {
      const hero = this.playerTeam[row.index];
      row.nameText.setText(hero.name);
      row.hpText.setText(`${fmtNum(hero.currentHp)}/${fmtNum(hero.maxHp)}`);
      row.nameText.setColor(hero.alive ? '#e0e0e0' : '#666');
      row.hpText.setColor(hero.alive ? '#aaa' : '#666');
      row.keyText.setColor(hero.alive ? '#8b949e' : '#555');
      const selected = this.switchSelectedIndex === row.index;
      row.bg.setStrokeStyle(selected ? 2 : 1, hero.alive && selected ? 0x3498db : 0x3a3a5c);
    }
  }

  _onSwitchWindowKeyDown(event) {
    if (!this.engine.pendingPlayerSwitch) return;
    const aliveIndices = this.playerTeam.map((h, i) => i).filter((i) => this.playerTeam[i].alive);
    if (aliveIndices.length === 0) return;

    const key = event.keyCode;
    // 1, 2, 3 (key codes 49, 50, 51)
    if (key >= 49 && key <= 51) {
      const index = key - 49;
      if (this.playerTeam[index].alive) {
        this._confirmSwitchSelection(index);
        return;
      }
    }
    // Enter
    if (key === 13) {
      if (this.playerTeam[this.switchSelectedIndex].alive) {
        this._confirmSwitchSelection(this.switchSelectedIndex);
      }
      return;
    }
    // Arrow Up / Down
    if (key === 38) {
      const idx = aliveIndices.indexOf(this.switchSelectedIndex);
      const prev = idx <= 0 ? aliveIndices.length - 1 : idx - 1;
      this.switchSelectedIndex = aliveIndices[prev];
      return;
    }
    if (key === 40) {
      const idx = aliveIndices.indexOf(this.switchSelectedIndex);
      const next = idx < 0 || idx >= aliveIndices.length - 1 ? 0 : idx + 1;
      this.switchSelectedIndex = aliveIndices[next];
      return;
    }
  }

  _onSwitchWindowRowClicked(index) {
    if (!this.engine.pendingPlayerSwitch || !this.playerTeam[index].alive) return;
    this._confirmSwitchSelection(index);
  }

  _confirmSwitchSelection(index) {
    if (!this.engine.selectNextPlayerHero(index)) return;
    this.playerActiveUI.setHero(this.engine.getPlayerActive());
    this._hideSwitchWindow();
  }

  _addDamageLogEntry(result) {
    if (result.attacker == null || result.atk == null || result.effectiveDef == null) return;
    const baseDef = result.baseDef ?? result.effectiveDef;
    const guardStr = result.guarded ? ' (guard +10% DEF)' : '';
    const summaryLine = `${result.attacker.name} ${result.atk} ATK vs ${result.target.name} ${fmtNum(result.effectiveDef)} DEF${guardStr} → ${fmtNum(result.damage)} dmg`;
    let formulaLine;
    if (result.guarded) {
      const defTerm = `${baseDef} + (${baseDef} × 0.1)`;
      formulaLine = `  effective_def = ${defTerm} = ${fmtNum(result.effectiveDef)}; max(1, atk - effective_def) = ${fmtNum(result.damage)}`;
    } else {
      formulaLine = `  max(1, atk - def) = max(1, ${result.atk} - ${fmtNum(result.effectiveDef)}) = ${fmtNum(result.damage)}`;
    }
    const lineHeight = this.debugLineHeight;
    let y1 = this.debugLogContentHeight;
    const text1 = this.add.text(0, y1, summaryLine, { fontSize: FONT_SIZE_DEBUG_UI, fontFamily: GAME_FONT, color: '#b0b0b0' }).setOrigin(0, 0);
    this.debugLogContainer.add(text1);
    this.debugLogEntries.push({ text: text1, y: y1 });
    this.debugLogContentHeight += lineHeight;
    const y2 = this.debugLogContentHeight;
    const text2 = this.add.text(0, y2, formulaLine, { fontSize: FONT_SIZE_DEBUG_UI, fontFamily: GAME_FONT, color: '#8b949e' }).setOrigin(0, 0);
    this.debugLogContainer.add(text2);
    this.debugLogEntries.push({ text: text2, y: y2 });
    this.debugLogContentHeight += lineHeight;
    while (this.debugLogEntries.length > this.debugMaxLines) {
      const old = this.debugLogEntries.shift();
      old.text.destroy();
      const old2 = this.debugLogEntries.shift();
      old2.text.destroy();
      for (let i = 0; i < this.debugLogEntries.length; i++) {
        this.debugLogEntries[i].text.y = i * lineHeight;
        this.debugLogEntries[i].y = i * lineHeight;
      }
      this.debugLogContentHeight = this.debugLogEntries.length * lineHeight;
    }
    this.debugLogScroll = Math.max(0, this.debugLogContentHeight - this.debugContentHeight);
    this._updateDebugLogScroll();
  }

  _updateDebugLogScroll() {
    this.debugLogContainer.y =
      this.debugContentTop + this.debugContentHeight - this.debugLogContentHeight + this.debugLogScroll;
  }

  _updateAttackButtonVisibility() {
    const current = this.engine.currentTurnHero;
    const isPlayerTurn = current && this.playerTeam.includes(current);
    const canAct = isPlayerTurn && !this.engine.isBattleOver() && !this.engine.pendingPlayerSwitch;
    this.attackBtn.setVisible(canAct);
    this.attackBtnText.setVisible(canAct);
    this.guardBtn.setVisible(canAct);
    this.guardBtnText.setVisible(canAct);
  }

  _updateTurnInstructions() {
    if (this.engine.isBattleOver()) {
      this.instructionText.setText('Battle over.');
      this.instructionSubtext.setText('');
      return;
    }
    if (this.engine.pendingPlayerSwitch) {
      this.instructionText.setText('Choose your next hero!');
      this.instructionSubtext.setText('Press 1/2/3 or \u2191\u2193 + Enter, or click a hero.');
      return;
    }
    const current = this.engine.currentTurnHero;
    const pActive = this.engine.getPlayerActive();
    const eActive = this.engine.getEnemyActive();
    const pct1 = Math.round(pActive.chargeProgress() * 100);
    const pct2 = Math.round(eActive.chargeProgress() * 100);
    if (current && this.playerTeam.includes(current)) {
      this.instructionText.setText("Your turn — choose an action.");
      this.instructionSubtext.setText("Attack or Guard (+10% DEF until your next turn).");
    } else if (current && this.enemyTeam.includes(current)) {
      this.instructionText.setText("Enemy's turn.");
      this.instructionSubtext.setText("They will act in a moment.");
    } else {
      this.instructionText.setText("Waiting for a turn — ATB bars are filling.");
      this.instructionSubtext.setText(`Your bar: ${pct1}% · Enemy bar: ${pct2}%`);
    }
  }

  _showDamagePop(x, y, amount) {
    const startY = y - 15;
    const endY = startY - 55;
    const dmgText = this.add
      .text(x, startY, `-${fmtNum(amount)}`, {
        fontSize: FONT_SIZE_DAMAGE_POP,
        fontFamily: GAME_FONT,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(0.5)
      .setDepth(600);
    this.tweens.add({ targets: dmgText, scale: 1.15, duration: 280, ease: 'Back.Out' });
    this.tweens.add({
      targets: dmgText,
      y: endY,
      alpha: 0,
      duration: 900,
      ease: 'Power2.InOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  _executeAI() {
    if (this.engine.isBattleOver()) return;
    const current = this.engine.currentTurnHero;
    if (!current || !this.enemyTeam.includes(current)) return;

    const playerActive = this.engine.getPlayerActive();
    const action = getAIAction(current, [playerActive]);
    if (!action || action.type === 'pass') {
      this.engine.actPass();
      return;
    }
    if (action.type === 'guard') {
      this.engine.actGuard();
      return;
    }
    const target = action.targetId === playerActive.id ? playerActive : this.playerTeam.find((h) => h.id === action.targetId);
    if (!target?.alive) {
      this.engine.actPass();
      return;
    }
    const result = this.engine.actAttack(target);
    this._addDamageLogEntry(result);
    if (result.damage > 0) {
      this._showDamagePop(this.playerCard.x, this.playerCard.y, result.damage);
    }
  }

  _onGuardClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    this.engine.actGuard();
  }

  _onAttackClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    const target = this.engine.getEnemyActive();
    if (!target.alive) return;
    const result = this.engine.actAttack(target);
    this._addDamageLogEntry(result);
    if (result.damage > 0) {
      this._showDamagePop(this.enemyCard.x, this.enemyCard.y, result.damage);
    }
  }

  _showVictory() {
    if (this.victoryText.visible) return;
    const winner = this.engine.getVictor();
    const message = winner === 'player' ? 'You win!' : winner === 'enemy' ? 'Enemy wins!' : 'Draw!';
    this.victoryText.setText(message).setVisible(true);
  }
}
