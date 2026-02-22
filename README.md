# SuiMinia

Pokémon-style team ATB (Active Time Battle) card game using **Phaser 3.90.0**. Two teams of up to 3 heroes; one active per side. When your ATB bar fills, choose Attack, Skill, Guard, or Switch—or pick the next hero when the active is KO'd.

## Setup

```bash
bun install
bun run dev
```

## Scene flow

**Boot** → **Preload** → **Title** → **Lobby** → **Battle**

- **Title**: Game name and "start" (click or Enter/Space) → Lobby.
- **Lobby**: Choose opponent team (left, 8/12) and your party (right, 4/12). Party size **1–3**; "View full details" shows stats; **Fight!** starts battle with the selected opponent.
- **Battle**: Team battle with ATB, Attack/Skill/Guard/Switch, **skills** (max 4 per hero), **stagger** meter, and configurable **AI** per enemy hero. After battle, **GameResultScreen** shows win/lose and per-hero stats; **Back to Lobby** returns to Lobby.

## Quick reference

- **Damage**: Basic `max(MIN_DAMAGE, ATK - DEF)`; guard uses DEF × 1.7. **Skills** use `(ATK + SkillDamage) + (ATK × damageMultiplier)` as effective ATK before DEF. **Staggered** targets take 200% damage.
- **Stagger**: Meter fills when hit while guarding; when full, hero becomes **Staggered** (takes 2× damage, cannot guard) until they act.
- **Turns**: ATB fills at rate **SPD** per tick; at 100% that hero can act (Attack, Skill, Guard, Pass, or Switch).
- **Skills**: Each hero has up to **4 skills** (configured in team data). **S** or Skill button opens the skill selection window; choosing a skill triggers an attack with that skill's damage formula.
- **Teams**: Up to 3 heroes per side; one active at a time. When active dies, that side chooses next (player via Switch Hero window, AI at random). Party can be 1–3 members.
- **AI**: Per-hero **behavior** (`aggressive` / `defensive` / `balanced`) and optional **actionRatio** in enemy team data. Defensive alternates guard/attack at high HP, guards more at low HP; balanced uses attack/guard ratio.
- **Victory**: Battle ends when one team has no alive heroes; result screen shows both teams' stats and **Back to Lobby**.

## Project structure

```
src/
├── main.js                    # Phaser config, scene list
├── config/
│   ├── constants.js           # MAX_CHARGE, MIN_DAMAGE, stagger, layout, fonts
│   └── teamData.js            # DEFAULT_PLAYER_PARTY, ENEMY_TEAMS (heroes with skills, behavior)
├── data/
│   └── skills.js              # SKILLS database, MAX_SKILLS_PER_HERO (4), getSkillPower, getSkillById
├── scenes/
│   ├── BootScene.js           # Boot → Preload
│   ├── PreloadScene.js        # Load assets → Title
│   ├── TitleScene.js          # Title screen → Lobby
│   ├── LobbyScene.js          # Choose opponent + party (1–3) → Battle
│   └── BattleScene.js        # Team battle, ATB, skills, UI composition
├── entities/
│   ├── Hero.js                # Hero: stats, charge, guard, stagger, staggered, battle stats
│   └── HeroUI.js              # Active-hero display (name, HP, ATB, stagger bar)
├── battle/
│   ├── BattleEngine.js        # actAttack (with skillId), actGuard, actPass, switch, stagger
│   ├── TurnQueue.js           # ATB tick(), getCurrentTurn(), tickUntilReady()
│   ├── DamageCalculator.js    # max(MIN_DAMAGE, atk - def) with multiplier
│   ├── StatusSystem.js        # STATUS_STAGGERED, getDamageTakenMultiplier
│   ├── ai/
│   │   ├── index.js           # getAIAction(aiHero, enemies, options) dispatcher
│   │   ├── aggressive.js     # Always attack
│   │   ├── defensive.js      # HP-based guard/alternate; staggered → attack
│   │   └── balanced.js       # actionRatio attack/guard
│   └── Player2AI.js           # Legacy (replaced by battle/ai)
└── ui/
    ├── PartyPanel.js          # Top bar: team boxes, HP, switch click
    ├── CommandBar.js          # Instructions + Attack / Skill / Guard / Switch
    ├── SkillSelectionWindow.js # Modal "Choose skill" (hero's skills, max 4); disables commands when open
    ├── SwitchHeroWindow.js    # Modal "Choose next hero" (keyboard + mouse)
    ├── DebugDamageLog.js      # Damage log: HeroName: Command (atk-def) [guard/stagger] = dmg; scroll wheel/arrows
    ├── VictoryOverlay.js      # Win/lose/draw text
    ├── GameResultScreen.js    # Result + per-hero stats, Back to Lobby
    └── CommandPop.js          # "Attack!" / "Strike!" etc. bubble above hero
```

## Documentation

Detailed design and APIs are in **[`.docs/`](.docs/)**:

| Document | Description |
|----------|-------------|
| [.docs/README.md](.docs/README.md) | Doc index, tech stack, quick ref |
| [.docs/game-logic.md](.docs/game-logic.md) | Constants, Hero, damage, ATB, stagger, skills, AI, input |
| [.docs/battle-system-architecture.md](.docs/battle-system-architecture.md) | BattleEngine, skills, switch phase, scene flow |
| [.docs/windows.md](.docs/windows.md) | PartyPanel, CommandBar, SkillSelectionWindow, SwitchHeroWindow, DebugDamageLog, GameResultScreen, HeroUI |

## Tech stack

- **Framework**: Phaser 3.90.0  
- **Runtime**: ES modules, Vite, Bun  

## Extending

- **New skills**: Add entries to `SKILLS` in `src/data/skills.js`; assign up to 4 skill IDs per hero in `teamData.js`.
- **New AI behaviors**: Add a module in `src/battle/ai/` and register it in `ai/index.js`; set `behavior` (and optional `actionRatio`) per enemy hero in `ENEMY_TEAMS`.
- **New opponents**: Add entries to `ENEMY_TEAMS` in `src/config/teamData.js` (each hero can have `skills`, `behavior`, `actionRatio`).
- **New scenes**: Register in `main.js` and start from another scene with `this.scene.start('Key')`.
