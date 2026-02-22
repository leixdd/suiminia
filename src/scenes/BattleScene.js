/**
 * BattleScene: Pokemon-style team battle. 3 heroes per side, one active at a time.
 * Composes modular UI: PartyPanel, SwitchHeroWindow, CommandBar, DebugDamageLog, VictoryOverlay.
 */
import Phaser from 'phaser';
import { Hero } from '../entities/Hero.js';
import { TEAM_SIZE } from '../config/constants.js';
import { HeroUI } from '../entities/HeroUI.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import { getAIAction } from '../battle/ai/index.js';
import { SwitchHeroWindow } from '../ui/SwitchHeroWindow.js';
import { SkillSelectionWindow } from '../ui/SkillSelectionWindow.js';
import { PartyPanel } from '../ui/PartyPanel.js';
import { CommandBar } from '../ui/CommandBar.js';
import { DebugDamageLog } from '../ui/DebugDamageLog.js';
import { VictoryOverlay } from '../ui/VictoryOverlay.js';
import { GameResultScreen } from '../ui/GameResultScreen.js';
import { showCommandPop } from '../ui/CommandPop.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BATTLE_PADDING,
  CARD_WIDTH,
  CARD_HEIGHT,
  FONT_SIZE_DAMAGE_POP,
  GAME_FONT,
} from '../config/constants.js';
import { DEFAULT_PLAYER_PARTY } from '../config/teamData.js';
import { getSkillById, MAX_SKILLS_PER_HERO } from '../data/skills.js';

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

  create(data = {}) {
    const playerConfig = data.playerParty ?? DEFAULT_PLAYER_PARTY;
    const enemyConfig = data.enemyTeam?.heroes ?? [
      { name: 'Shadow', atk: 20, def: 8, spd: 4, maxHp: 100 },
      { name: 'Blade', atk: 24, def: 6, spd: 6, maxHp: 100 },
      { name: 'Fang', atk: 18, def: 9, spd: 9, maxHp: 100 },
    ];
    let playerTeam = createTeamHeroes(
      'player',
      playerConfig.map((h) => h.name),
      playerConfig
    );
    let enemyTeam = createTeamHeroes(
      'enemy',
      enemyConfig.map((h) => h.name),
      enemyConfig
    );
    while (playerTeam.length < TEAM_SIZE) {
      playerTeam.push(Hero.createEmpty(`player${playerTeam.length + 1}`));
    }
    while (enemyTeam.length < TEAM_SIZE) {
      enemyTeam.push(Hero.createEmpty(`enemy${enemyTeam.length + 1}`));
    }

    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.playerPartyConfig = Array.isArray(playerConfig) ? playerConfig : [];
    this.enemyTeamConfig = data.enemyTeam ?? null;
    this._lastEnemyActionByHero = {};
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

    this.partyPanel = new PartyPanel(this, {
      getPlayerTeam: () => this.playerTeam,
      getEnemyTeam: () => this.enemyTeam,
      getPlayerActive: () => this.engine.getPlayerActive(),
      getEnemyActive: () => this.engine.getEnemyActive(),
      isPendingPlayerSwitch: () => this.engine.pendingPlayerSwitch,
      onPlayerSlotClick: (index) => this._onPlayerSlotClick(index),
    });

    // Switch Hero window (keyboard + mouse); callback runs when player picks a hero
    this.switchHeroWindow = new SwitchHeroWindow(this, {
      getTeam: () => this.playerTeam,
      onSelect: (index) => {
        if (this.engine.selectNextPlayerHero(index)) {
          this.playerActiveUI.setHero(this.engine.getPlayerActive());
        }
      },
    });

    this.victoryOverlay = new VictoryOverlay(this);
    this.gameResultScreen = new GameResultScreen(this);
    this.debugDamageLog = new DebugDamageLog(this);
    this.commandBar = new CommandBar(this, {
      onAttack: () => this._onAttackClicked(),
      onGuard: () => this._onGuardClicked(),
      onSwitch: () => this._onSwitchClicked(),
      onSkill: () => this._onSkillClicked(),
    });

    this.skillSelectionWindow = new SkillSelectionWindow(this, {
      onSelect: (skillId) => this._onSkillSelected(skillId),
      onHide: () => { this._skillWindowOpen = false; },
    });

    this._skillWindowOpen = false;

    this.input.keyboard.on('keydown', (event) => {
      if (this._skillWindowOpen) return;
      if (this.engine.isBattleOver() || this.engine.pendingPlayerSwitch) return;
      const current = this.engine.currentTurnHero;
      if (!current || !this.playerTeam.includes(current)) return;
      if (event.keyCode === 65) this._onAttackClicked();   // A -> Attack
      else if (event.keyCode === 68) this._onGuardClicked(); // D -> Guard
      else if (event.keyCode === 83) this._onSkillClicked(); // S -> Skill
      else if (event.keyCode === 81) this._onSwitchClicked(); // Q -> Switch
    });

    this.time.delayedCall(200, () => this.partyPanel.playIn());

    this._aiScheduled = false;
    this._victoryScheduled = false;
    this._enemySwitchScheduled = false;
    this._switchWindowOpen = false;
  }

  update() {
    if (this.engine.isBattleOver()) {
      this._syncBars();
      this.partyPanel.sync();
      this._updateCommandBar();
      if (!this._victoryScheduled) {
        this._victoryScheduled = true;
        this.time.delayedCall(VICTORY_DELAY_MS, () => {
          this.gameResultScreen.show(
            this.engine.getVictor(),
            this.playerTeam,
            this.enemyTeam
          );
        });
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

    // Player switch: show window once when entering, then sync each frame
    if (this.engine.pendingPlayerSwitch) {
      if (!this._switchWindowOpen) {
        this._switchWindowOpen = true;
        this.switchHeroWindow.show();
      }
      this.switchHeroWindow.sync();
      this.partyPanel.sync();
      return;
    }
    this._switchWindowOpen = false;
    this.switchHeroWindow.hide();

    this.engine.tick();
    this.playerActiveUI.setHero(this.engine.getPlayerActive());
    this.enemyActiveUI.setHero(this.engine.getEnemyActive());
    this._syncBars();
    this.partyPanel.sync();
    this._updateCommandBar();

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

  _onPlayerSlotClick(index) {
    if (!this.engine.pendingPlayerSwitch) return;
    if (this.engine.selectNextPlayerHero(index)) {
      this.playerActiveUI.setHero(this.engine.getPlayerActive());
    }
  }

  _updateCommandBar() {
    const current = this.engine.currentTurnHero;
    const isPlayerTurn = current && this.playerTeam.includes(current);
    const canAct = isPlayerTurn && !this.engine.isBattleOver() && !this.engine.pendingPlayerSwitch;
    this.commandBar.setButtonsVisible(!this.engine.isBattleOver());
    if (this._skillWindowOpen) {
      this.commandBar.setButtonsEnabled(false);
      this.commandBar.setGuardEnabled(false);
      this.commandBar.setSkillEnabled(false);
      this.commandBar.setInstructions('Choose a skill', '1–4 or \u2191\u2193, Enter · Esc to cancel');
      return;
    }
    this.commandBar.setButtonsEnabled(canAct);
    const pActive = this.engine.getPlayerActive();
    const eActive = this.engine.getEnemyActive();
    this.commandBar.setGuardEnabled(canAct && !pActive.staggered);
    this.commandBar.setSkillEnabled(canAct && this._getCurrentPlayerSkillIds().length > 0);

    if (this.engine.isBattleOver()) {
      this.commandBar.setInstructions('Battle over.', '');
      return;
    }
    if (this.engine.pendingPlayerSwitch) {
      this.commandBar.setInstructions('Choose your next hero!', 'Press 1/2/3 or \u2191\u2193 + Enter, or click a hero.');
      return;
    }
    const pct1 = Math.round(pActive.chargeProgress() * 100);
    const pct2 = Math.round(eActive.chargeProgress() * 100);
    if (current && this.playerTeam.includes(current)) {
      this.commandBar.setInstructions('Your turn — choose an action.', 'A Attack · S Skill · D Guard · Q Switch');
    } else if (current && this.enemyTeam.includes(current)) {
      this.commandBar.setInstructions("Enemy's turn.", 'They will act in a moment.');
    } else {
      this.commandBar.setInstructions('Waiting for a turn — ATB bars are filling.', `Your bar: ${pct1}% · Enemy bar: ${pct2}%`);
    }
  }

  _showDamagePop(x, y, amount, color = '#ffffff', scale = 0.5, isMultipleHitsTotal = false) {
    const startY = y - 15;
    const endY = startY - 55;
    const dmgText = this.add
      .text(x, startY, `${isMultipleHitsTotal ? '' : '-'}${fmtNum(amount)}`, {
        fontSize: FONT_SIZE_DAMAGE_POP,
        fontFamily: GAME_FONT,
        color: color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScale(scale)
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

  /** Show damage pop(s). If result.hitDamages has multiple values, show one pop per hit with staggered delay, then a total damage pop. */
  _showDamagePops(x, y, result) {
    if (result.damage <= 0) return;
    const hits = result.hitDamages;
    if (hits?.length > 1) {
      const delayMs = 180;
      hits.forEach((amount, i) => {
        this.time.delayedCall(i * delayMs, () => this._showDamagePop(x, y, amount));
      });
      // Total damage pop after per-hit pops, slightly offset so it stays visible alongside them
      const totalPopDelayMs = hits.length * (delayMs + 50);
      this.time.delayedCall(totalPopDelayMs, () => this._showDamagePop(x + 28, y, result.damage, 'yellow', 0.9, true));
    } else {
      this._showDamagePop(x, y, result.damage);
    }
  }

  /** Get AI config for an enemy hero (behavior, actionRatio) by slot index. */
  _getEnemyHeroConfig(hero) {
    if (!this.enemyTeamConfig?.heroes) return null;
    const index = this.enemyTeam.indexOf(hero);
    if (index < 0) return null;
    return this.enemyTeamConfig.heroes[index] ?? null;
  }

  _executeAI() {
    if (this.engine.isBattleOver()) return;
    const current = this.engine.currentTurnHero;
    if (!current || !this.enemyTeam.includes(current)) return;

    const heroConfig = this._getEnemyHeroConfig(current);
    const playerActive = this.engine.getPlayerActive();
    const aiOptions = {
      behavior: heroConfig?.behavior,
      actionRatio: heroConfig?.actionRatio,
      lastAction: this._lastEnemyActionByHero[current.id],
    };
    const action = getAIAction(current, [playerActive], aiOptions);
    this._lastEnemyActionByHero[current.id] = action?.type ?? null;

    const label = !action || action.type === 'pass' ? 'Pass!' : action.type === 'guard' ? 'Guard!' : 'Attack!';
    showCommandPop(this, this.enemyCard.x, this.enemyCard.y, label);

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
    this.debugDamageLog.addEntry(result);
    this._showDamagePops(this.playerCard.x, this.playerCard.y, result);
  }

  _onGuardClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    if (current.staggered) return; // Guard disabled while staggered
    showCommandPop(this, this.playerCard.x, this.playerCard.y, 'Guard!');
    this.engine.actGuard();
  }

  _onSwitchClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    showCommandPop(this, this.playerCard.x, this.playerCard.y, 'Switch!');
    this.engine.requestVoluntarySwitch();
  }

  _onAttackClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    const target = this.engine.getEnemyActive();
    if (!target.alive) return;
    showCommandPop(this, this.playerCard.x, this.playerCard.y, 'Attack!');
    const result = this.engine.actAttack(target);
    this.debugDamageLog.addEntry(result);
    this._showDamagePops(this.enemyCard.x, this.enemyCard.y, result);
  }

  _getCurrentPlayerSkillIds() {
    const config = this.playerPartyConfig[this.engine.playerActiveIndex];
    const ids = config?.skills ?? [];
    return ids.slice(0, MAX_SKILLS_PER_HERO);
  }

  _onSkillClicked() {
    const current = this.engine.currentTurnHero;
    if (!current || !this.playerTeam.includes(current)) return;
    const target = this.engine.getEnemyActive();
    if (!target.alive) return;
    const skillIds = this._getCurrentPlayerSkillIds();
    if (skillIds.length === 0) return;
    this._skillWindowOpen = true;
    this.skillSelectionWindow.show(skillIds);
  }

  _onSkillSelected(skillId) {
    const target = this.engine.getEnemyActive();
    if (!target?.alive) return;
    const skill = getSkillById(skillId);
    const label = skill ? `${skill.name}!` : 'Attack!';
    showCommandPop(this, this.playerCard.x, this.playerCard.y, label);
    const result = this.engine.actAttack(target, { skillId });
    this.debugDamageLog.addEntry(result);
    this._showDamagePops(this.enemyCard.x, this.enemyCard.y, result);
  }
}
