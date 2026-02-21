# Mini Hero Battle — Documentation

This folder contains the game logic and architecture documentation for the **Mini Hero Battle** 1v1 ATB (Active Turn-Based) card battle game.

## Contents

| Document | Description |
|----------|-------------|
| [Game Logic](./game-logic.md) | Full game logic: constants, Hero, damage, ATB, turn queue, battle engine, AI, and scene flow |

## Tech Stack

- **Framework**: Phaser 3.90.0  
- **Architecture**: Scene-based (Boot → Preload → Battle)  
- **Runtime**: ES modules, Vite, Bun  

## Quick Reference

- **Damage**: `FinalDamage = max(1, ATK - DEF)`  
- **Turns**: ATB bars fill at rate **SPD** per tick; at 100% that hero can act (Attack or Pass).  
- **Win**: Battle ends when at most one hero is alive.
