# Mini Hero Battle — Documentation

This folder contains the game logic, battle system architecture, and UI/windows documentation for **Mini Hero Battle**: a Pokémon-style team ATB (Active Time Battle) card game.

## Contents

| Document | Description |
|----------|-------------|
| [Game Logic](./game-logic.md) | Constants, Hero entity, damage formula, ATB, teams, victory, AI, and player input (A/D/Q) |
| [Battle System Architecture](./battle-system-architecture.md) | BattleEngine, TurnQueue, teams, active hero, switch phase, and how the scene drives the engine |
| [Windows](./windows.md) | All UI modules: PartyPanel, CommandBar, SwitchHeroWindow, DebugDamageLog, VictoryOverlay, CommandPop, HeroUI |

## Tech Stack

- **Framework**: Phaser 3.90.0  
- **Architecture**: Scene-based (Boot → Preload → Battle); modular UI in `src/ui/`  
- **Runtime**: ES modules, Vite, Bun  

## Quick Reference

- **Damage**: `FinalDamage = max(MIN_DAMAGE, ATK - DEF)`; guard uses DEF × 1.1.  
- **Turns**: ATB fills at rate **SPD** per tick; at 100% that hero can act (Attack, Guard, Pass, or Switch).  
- **Teams**: 3 heroes per side; one active at a time. When active dies, that side chooses next (player via window, AI at random).  
- **Victory**: Battle ends when one team has no alive heroes.
