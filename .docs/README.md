# Mini Hero Battle — Documentation

This folder contains the game logic, battle system architecture, and UI/windows documentation for **Mini Hero Battle**: a Pokémon-style team ATB (Active Time Battle) card game with skills, stagger, and configurable AI.

## Contents

| Document | Description |
|----------|-------------|
| [Game Logic](./game-logic.md) | Constants, Hero entity, damage formula (basic + skills), ATB, stagger/status, teams, victory, AI (per-hero behavior), and player input (A/S/D/Q/P, Esc in windows) |
| [Battle System Architecture](./battle-system-architecture.md) | BattleEngine, actAttack with skills, TurnQueue, switch phase, AI dispatch, and how the scene drives the engine |
| [Windows](./windows.md) | All UI modules: PartyPanel, CommandBar, SkillSelectionWindow, SwitchHeroWindow, DebugDamageLog, GameResultScreen, VictoryOverlay, CommandPop, HeroUI |

## Tech Stack

- **Framework**: Phaser 3.90.0  
- **Architecture**: Scene-based (Boot → Preload → Title → Lobby → Battle); modular UI in `src/ui/`, data in `src/data/`  
- **Runtime**: ES modules, Vite, Bun  

## Quick Reference

- **Damage**: Basic `max(MIN_DAMAGE, ATK - DEF)`; guard uses DEF × 1.7. Skills: effective ATK = `(ATK + SkillDamage) + (ATK × damageMultiplier)` then same DEF subtraction. Staggered target takes 120% damage (+20%).
- **Stagger**: Fills when hit while guarding; at full, hero is Staggered (ATB reset to 0, 120% damage taken, cannot Attack/Guard/Skill—only Skip/Switch). When their turn would come while staggered, they lose that turn and recover; next non-staggered hero acts.
- **Turns**: ATB fills at rate **SPD** per tick; at 100% that hero can act (Attack, Skill, Guard, **Skip**, or Switch). Staggered heroes are skipped (recover and lose the turn) so the other side is not blocked.
- **Skills**: Max 4 per hero (in team data); S or Skill button opens selection; choice triggers attack with skill formula.
- **Teams**: 3 heroes per side; one active at a time. Switch on KO or voluntary Switch.
- **AI**: Per-hero `behavior` (aggressive / defensive / balanced) and optional `actionRatio` in enemy team config.
- **Victory**: One team has no alive heroes; result screen with Back to Lobby.
