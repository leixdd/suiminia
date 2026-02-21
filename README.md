# SuiMinia

Pokémon-style team ATB (Active Time Battle) card game using **Phaser 3.90.0**. Two teams of up to 3 heroes; one active per side. When your ATB bar fills, choose Attack, Guard, or Switch—or pick the next hero when the active is KO’d.

## Setup

```bash
bun install
bun run dev
```

## Scene flow

**Boot** → **Preload** → **Title** → **Lobby** → **Battle**

- **Title**: Game name and “start” (click or Enter/Space) → Lobby.
- **Lobby**: Choose opponent team (left, 8/12) and your party (right, 4/12). Party size **1–3**; “View full details” shows stats; **Fight!** starts battle with the selected opponent.
- **Battle**: Team battle with ATB, Attack/Guard/Switch, switch-on-KO, and AI for the enemy. After battle, **GameResultScreen** shows win/lose and per-hero stats (attacks, damage dealt, damage received).

## Quick reference

- **Damage**: `max(MIN_DAMAGE, ATK - DEF)`; guard uses DEF × 1.1.
- **Turns**: ATB fills at rate **SPD** per tick; at 100% that hero can act (Attack, Guard, Pass, or Switch).
- **Teams**: Up to 3 heroes per side; one active at a time. When active dies, that side chooses next (player via Switch Hero window, AI at random). Party can be 1–3 members (minimum 1, maximum 3).
- **Victory**: Battle ends when one team has no alive heroes; result screen shows both teams’ stats.

## Project structure

```
src/
├── main.js                    # Phaser config, scene list
├── config/
│   ├── constants.js           # MAX_CHARGE, MIN_DAMAGE, TEAM_SIZE, layout, fonts
│   └── teamData.js            # DEFAULT_PLAYER_PARTY, ENEMY_TEAMS (for Lobby + Battle)
├── scenes/
│   ├── BootScene.js           # Boot → Preload
│   ├── PreloadScene.js        # Load assets → Title
│   ├── TitleScene.js          # Title screen → Lobby
│   ├── LobbyScene.js          # Choose opponent + party (1–3) → Battle
│   └── BattleScene.js         # Team battle, ATB, UI composition
├── entities/
│   ├── Hero.js                # Hero: id, name, ATK, DEF, SPD, HP, charge, guard, battle stats
│   └── HeroUI.js              # Active-hero display (name, HP bar, ATB bar)
├── battle/
│   ├── BattleEngine.js        # Teams, active indices, turn queue, actAttack/Guard/Pass/Switch
│   ├── TurnQueue.js           # ATB tick(), getCurrentTurn(), tickUntilReady()
│   ├── DamageCalculator.js    # FinalDamage = max(MIN_DAMAGE, ATK - DEF)
│   └── Player2AI.js           # AI: attack / guard / pass
└── ui/
    ├── PartyPanel.js          # Top bar: team boxes, HP, switch click, tooltip stats
    ├── CommandBar.js          # Instructions + Attack / Guard / Switch
    ├── SwitchHeroWindow.js    # Modal “Choose next hero” (keyboard + mouse)
    ├── DebugDamageLog.js      # Damage formula log
    ├── VictoryOverlay.js      # Win/lose/draw text (legacy; result screen used after battle)
    ├── GameResultScreen.js    # Full-width result + per-hero stats (attacks, dealt, received)
    └── CommandPop.js         # “Attack!” / “Guard!” bubble above hero
```

## Documentation

Detailed design and APIs are in **[`.docs/`](.docs/)**:

| Document | Description |
|----------|-------------|
| [.docs/README.md](.docs/README.md) | Doc index, tech stack, quick ref |
| [.docs/game-logic.md](.docs/game-logic.md) | Constants, Hero, damage formula, ATB, teams, victory, AI, input |
| [.docs/battle-system-architecture.md](.docs/battle-system-architecture.md) | BattleEngine, TurnQueue, switch phase, scene flow |
| [.docs/windows.md](.docs/windows.md) | All UI modules: PartyPanel, CommandBar, SwitchHeroWindow, DebugDamageLog, VictoryOverlay, GameResultScreen, CommandPop, HeroUI |

## Tech stack

- **Framework**: Phaser 3.90.0  
- **Runtime**: ES modules, Vite, Bun  

## Extending

- **New abilities**: Add methods to `BattleEngine` (e.g. `actAbility(hero, target, id)`) and use `DamageCalculator.calculate()` or custom logic.
- **New opponents**: Add entries to `ENEMY_TEAMS` in `src/config/teamData.js`.
- **New scenes**: Register in `main.js` and start from another scene with `this.scene.start('Key')`.
