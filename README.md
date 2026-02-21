# Mini Hero Battle

1v1 ATB (Active Turn-Based) card battle game using **Phaser 3.90.0**.

## Setup

```bash
bun install
bun run dev
```

## Project Structure

```
src/
├── main.js                 # Phaser config, scene list
├── config/
│   └── constants.js        # MAX_CHARGE, MIN_DAMAGE, layout constants
├── scenes/
│   ├── BootScene.js        # Boot → Preload
│   ├── PreloadScene.js    # Load assets → Battle
│   └── BattleScene.js     # 1v1 layout, cards, ATB bars, Attack
├── entities/
│   └── Hero.js            # Hero: id, name, ATK, DEF, SPD, HP, charge
└── battle/
    ├── BattleEngine.js    # Ties turn queue + damage + win state
    ├── TurnQueue.js       # ATB: tick(), getReady(), getCurrentTurn()
    └── DamageCalculator.js # FinalDamage = max(1, ATK - DEF)
```

## Combat

- **ATB**: Each hero has a charge bar that fills at rate **SPD** per tick. When it reaches 100, that hero can act (select Attack).
- **Damage**: `FinalDamage = max(1, ATK - DEF)`.
- **Flow**: Player 1 (left) and Player 2 (right). When your bar is full, click the enemy card to target, then click **Attack**.

## Extending

- New abilities: add methods to `BattleEngine` (e.g. `actAbility(hero, target, abilityId)`) and call `DamageCalculator.calculate()` or custom logic.
- AI: when `currentTurnHero.id === 'player2'`, call `engine.actAttack(hero1)` after a short delay instead of waiting for input.
