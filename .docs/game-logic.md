# Game Logic — Mini Hero Battle

This document describes the whole game logic: constants, entities, combat math, turn system, battle engine, AI, and scene flow.

---

## 1. Constants (`src/config/constants.js`)

Central tuning and layout values.

| Constant | Value | Meaning |
|----------|--------|---------|
| `MAX_CHARGE` | 100 | ATB charge needed (points) before a hero can act |
| `CHARGE_PER_TICK` | 1 | Scale factor for charge gain per tick (charge += SPD × this) |
| `MIN_DAMAGE` | 1 | Minimum damage any attack can deal |
| `GAME_WIDTH` | 800 | Canvas width |
| `GAME_HEIGHT` | 600 | Canvas height |
| `BATTLE_PADDING` | 80 | Horizontal padding for hero card areas |
| `CARD_WIDTH` | 120 | Placeholder card width |
| `CARD_HEIGHT` | 160 | Placeholder card height |

---

## 2. Hero Entity (`src/entities/Hero.js`)

Hero is the only combat unit. It holds stats, HP, and ATB state.

### Constructor options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique id (e.g. `'player1'`, `'player2'`) |
| `name` | string | Display name |
| `atk` | number | Raw attack value |
| `def` | number | Defense (subtracted from incoming damage) |
| `spd` | number | Speed; charge rate for ATB (clamped ≥ 1) |
| `maxHp` | number | Max HP (default 100) |
| `currentHp` | number | Current HP (defaults to maxHp) |

### Instance state

- **charge** (0..MAX_CHARGE): ATB progress; when ≥ MAX_CHARGE the hero can act.
- **alive**: `currentHp > 0`.
- **guarding**: When true, incoming damage uses +10% DEF until the hero's next action.

### Methods

| Method | Description |
|--------|-------------|
| `isReady()` | `alive && charge >= MAX_CHARGE` |
| `consumeTurn()` | Sets `charge = 0` (call after acting) |
| `startGuarding()` | Sets `guarding = true` (+10% DEF on incoming damage) |
| `clearGuarding()` | Sets `guarding = false` (e.g. when attacking or passing) |
| `takeDamage(amount)` | Applies damage (decimal allowed), updates `currentHp` (can be decimal) and `alive`, returns actual damage |
| `heal(amount)` | Increases `currentHp` up to `maxHp` |
| `chargeProgress()` | Returns charge as 0..1 for UI bar |

---

## 3. Damage (`src/battle/DamageCalculator.js`)

All damage uses the same formula and a single entry point.

### Formula

```
raw     = max(0, ATK - DEF)
base   = max(MIN_DAMAGE, raw)
final  = max(MIN_DAMAGE, floor(base × multiplier))
```

So: **FinalDamage = max(1, ATK - DEF)** when `multiplier` is 1. Damage is not floored; decimals are allowed.

### API

- **`DamageCalculator.calculate(atk, def, options?)`**  
  - `options.multiplier`: optional damage multiplier (default 1).  
  - Returns final damage (integer ≥ MIN_DAMAGE).

- **`DamageCalculator.fromHeroToHero(attacker, defender, options?)`**  
  - Uses `attacker.atk` and effective defender DEF: if `defender.guarding` then DEF × 1.1 (+10%), else `defender.def`; same formula and options.

---

## 4. Turn Queue — ATB (`src/battle/TurnQueue.js`)

Turn order is driven by ATB (Active Time Battle): each hero has a charge bar that fills over time. Who acts is whoever is “ready” (charge ≥ MAX_CHARGE). The queue does not advance time; the battle engine does that.

### Constructor

- **`new TurnQueue(heroes)`**  
  - `heroes`: array of `Hero` instances (e.g. [player1, player2]).

### Charge update

- **`tick()`**  
  - For each alive hero: `charge = min(MAX_CHARGE, charge + spd × CHARGE_PER_TICK)`.

### Who can act

- **`getReady()`**  
  - Returns all heroes with `isReady()`, sorted by charge (desc), then by SPD (desc).

- **`getCurrentTurn()`**  
  - Returns the first hero from `getReady()`, or `null` if none.

- **`hasReadyHero()`**  
  - True if at least one hero is ready.

### Advancing until someone is ready

- **`tickUntilReady(maxTicks?)`**  
  - Calls `tick()` repeatedly until `hasReadyHero()` or `maxTicks` (default 1000).  
  - Returns `true` if someone is ready.

---

## 5. Battle Engine (`src/battle/BattleEngine.js`)

The engine wires together heroes, turn queue, and damage. The scene calls `tick()` and `actAttack()` / `actPass()`.

### Constructor

- **`new BattleEngine(heroes)`**  
  - `heroes`: e.g. `[player1Hero, player2Hero]`.  
  - Creates internal `TurnQueue`, sets `currentTurnHero = null`, `victorId = null`.

### Turn flow

- **`tick()`**  
  - If battle over or `currentTurnHero !== null`, no-op.  
  - Otherwise: run `turnQueue.tick()`, then set `currentTurnHero = turnQueue.getCurrentTurn()`.  
  - So when no one is acting, ATB advances and the first ready hero becomes “current”.

### Actions

- **`actAttack(targetHero, options?)`**  
  - Requires `currentTurnHero` alive and `targetHero` alive.  
  - Computes damage with `DamageCalculator.fromHeroToHero(currentTurnHero, targetHero, options)`.  
  - Applies damage to `targetHero`, calls `currentTurnHero.consumeTurn()`, sets `currentTurnHero = null`.  
  - Calls `turnQueue.tickUntilReady()`, then sets `currentTurnHero = getCurrentTurn()`.  
  - Runs victory check.  
  - Returns `{ damage, targetAlive, attacker, target }`.

- **`actGuard()`**  
  - If there is a `currentTurnHero`, calls `startGuarding()` on them (+10% DEF on incoming damage until their next action), consumes their turn, then same “tick until ready” and sets new `currentTurnHero`.

- **`actPass()`**  
  - If there is a `currentTurnHero`, clears their guarding, consumes their turn, then same “tick until ready” and sets new `currentTurnHero`.  
  - Used for skip / future Item.

### Victory

- **`isBattleOver()`**  
  - True when `victorId !== null`.

- **`getVictor()`**  
  - Returns winner hero id, or `null` (draw or not over).

- **`_checkVictory()`**  
  - Counts alive heroes; if ≤ 1, sets `victorId` to that hero’s id (or null for draw).

---

## 6. Player 2 AI (`src/battle/Player2AI.js`)

Decides the AI’s action each time it’s Player 2’s turn.

### API

- **`getAIAction(aiHero, enemies)`**  
  - `aiHero`: the AI-controlled hero (player2).  
  - `enemies`: array of enemy heroes (e.g. [hero1]).  
  - Returns `null` if AI is dead or no enemies.  
  - If no alive enemies, returns `{ type: 'pass' }`.  
  - Otherwise returns `{ type: 'attack', targetId: target.id }` for the first alive enemy.  
  - Can be extended (e.g. choose lowest HP, use abilities).

The scene uses this result to call `engine.actAttack(target)` or `engine.actPass()` after a short delay (e.g. 600 ms).

---

## 7. Scene Flow (`src/main.js`, scenes)

### Game entry

- **Phaser config**: 800×600, Scale.FIT, autoCenter. Scenes: Boot → Preload → Battle.  
- **Resize**: `window resize` and `orientationchange` call `game.scale.refresh()` so the canvas stays responsive.

### Scene order

1. **Boot**  
   - Minimal setup; starts Preload.

2. **Preload**  
   - Loads placeholder textures (e.g. `hero-placeholder`, `hero-placeholder-p2`).  
   - Starts Battle.

3. **Battle**  
   - Creates two `Hero` instances (player1 left, player2 right).  
   - Creates `BattleEngine([hero1, hero2])`.  
   - Builds layout: hero cards, ATB bars, HP/name labels, feedback window (4/12), command window (8/12) with Attack button, victory text.  
   - **Update loop**:  
     - If battle over: show victory and return.  
     - `engine.tick()` to advance ATB.  
     - Sync ATB bars and labels from hero state.  
     - Show/hide Attack button when it’s player1’s turn.  
     - Update feedback text (turn state, “Click Attack…”, ATB %).  
     - If it’s player2’s turn and AI not yet scheduled: schedule a delayed call to `_executeAI()` (e.g. 600 ms), then run AI action via `getAIAction()` and `engine.actAttack()` or `engine.actPass()`.  
   - **Player input**: Attack button calls `engine.actAttack(hero2)` when it’s player1’s turn.  
   - **Damage pop**: When damage > 0, `_showDamagePop(x, y, amount)` shows a floating, easing damage number (Ragnarok-style).

### Layout (BattleScene)

- **Heroes**: Player 1 left, Player 2 (AI) right; constants define positions and card size.  
- **Bottom bar**: Feedback panel 4/12 width (turn status, ATB %), Command panel 8/12 width (Attack button).  
- **Damage**: Always shown on the unit that received the hit (player1 or player2 card).

---

## 8. End-to-End Flow Summary

1. **Battle start**: Two heroes, engine created, ATB at 0.  
2. **Each frame**: `engine.tick()` adds charge; when someone reaches 100%, they become `currentTurnHero`.  
3. **Player 1 turn**: Attack button visible; player clicks Attack → `engine.actAttack(hero2)` → damage applied, turn consumed, next turn resolved.  
4. **Player 2 turn**: After delay, AI `getAIAction()` returns attack player1 → `engine.actAttack(hero1)` → same flow.  
5. **Damage**: Uses `FinalDamage = max(1, ATK - DEF)`; pop shown on the hit hero.  
6. **Victory**: When ≤ 1 hero alive, `victorId` set; scene shows “Player 1 wins!” / “Player 2 wins!” / “Draw!”.

This is the complete game logic as implemented in the codebase.
