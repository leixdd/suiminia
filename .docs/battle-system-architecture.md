# Battle System Architecture

This document describes how the battle system is structured: engine, turn queue, teams, switch phase, and how the scene drives it.

---

## 1. Overview

- **BattleEngine** owns both teams, which hero is active on each side, the **TurnQueue** (built from the two actives only), and victory/switch state.
- **TurnQueue** only ever contains the two currently active heroes; it is rebuilt when either side switches.
- The **BattleScene** calls `tick()` every frame, reads `currentTurnHero`, and invokes `actAttack`, `actGuard`, `actPass`, or switch APIs. It also runs the AI when it’s the enemy’s turn.

---

## 2. BattleEngine (`src/battle/BattleEngine.js`)

### Constructor

```js
new BattleEngine(playerTeam, enemyTeam)
```

- **playerTeam** / **enemyTeam**: arrays of 3 `Hero` instances each.
- Tracks **playerActiveIndex** and **enemyActiveIndex** (0..2).
- Creates **TurnQueue** from `[playerTeam[playerActiveIndex], enemyTeam[enemyActiveIndex]]`.
- **currentTurnHero**: who must choose an action (or `null` while ATB is filling).
- **victorId**: `'player' | 'enemy' | null` when battle is over.
- **pendingPlayerSwitch** / **pendingEnemySwitch**: true when the active just died and that side must choose the next hero.

### Active heroes

- **`_getActiveHeroes()`** — Returns `[playerActive, enemyActive]`.
- **`getPlayerActive()`** / **`getEnemyActive()`** — Current active hero for each side.
- **`_rebuildTurnQueue()`** — Recreates the turn queue from the two actives (called after a switch).

### Turn flow

- **`tick()`**  
  - No-op if battle over, in switch phase, or `currentTurnHero !== null`.  
  - Otherwise: `turnQueue.tick()`, then `currentTurnHero = turnQueue.getCurrentTurn()`.

### Actions

- **`actAttack(targetHero, options?)`**  
  - Current turn hero attacks target; applies damage (DamageCalculator), consumes turn, clears `currentTurnHero`.  
  - If **target** is the active of their side and dies, sets **pendingPlayerSwitch** or **pendingEnemySwitch**.  
  - If no switch pending, runs `tickUntilReady()` and sets new `currentTurnHero`.  
  - Runs victory check.  
  - Returns result object (damage, attacker, target, effectiveDef, etc.).

- **`actGuard()`** — Current hero starts guarding, consumes turn, then same “tick until ready” and set `currentTurnHero`.

- **`actPass()`** — Current hero clears guard, consumes turn, then same “tick until ready” and set `currentTurnHero`.

### Voluntary switch

- **`requestVoluntarySwitch()`**  
  - Allowed only on player’s turn. Consumes that hero’s turn, sets `currentTurnHero = null`, sets **pendingPlayerSwitch = true**.  
  - Scene then shows the Switch Hero window; when the player picks, it calls `selectNextPlayerHero(index)`.

### Switch phase (after KO or voluntary switch)

- **`selectNextPlayerHero(index)`**  
  - Valid only when **pendingPlayerSwitch**. Sets **playerActiveIndex**, rebuilds turn queue, clears **pendingPlayerSwitch**, runs `tickUntilReady()`, sets **currentTurnHero**.

- **`selectNextEnemyHeroRandom()`**  
  - Valid only when **pendingEnemySwitch**. Picks a random alive enemy hero as new active, rebuilds turn queue, clears **pendingEnemySwitch**, runs `tickUntilReady()**, sets **currentTurnHero**.

### Victory

- **`isBattleOver()`** — `victorId !== null`.
- **`getVictor()`** — `'player' | 'enemy' | null`.
- **`_checkVictory()`** — If one team has no alive heroes, sets **victorId** to the other team (or null if both wiped).

---

## 3. TurnQueue (`src/battle/TurnQueue.js`)

- **Constructor**: accepts an array of heroes (in practice always the two actives).
- **tick()**: each alive hero gains `spd × CHARGE_PER_TICK` charge, capped at MAX_CHARGE.
- **getReady()**: heroes with `charge >= MAX_CHARGE`, sorted by charge then SPD.
- **getCurrentTurn()**: first ready hero or null.
- **tickUntilReady(maxTicks)**: repeatedly tick until someone is ready (used after an action to advance to the next turn).

The engine is responsible for passing only the two active heroes and rebuilding the queue when actives change.

---

## 4. DamageCalculator (`src/battle/DamageCalculator.js`)

- **calculate(atk, def, options?)**: `max(MIN_DAMAGE, max(0, atk - def) × multiplier)`.
- **fromHeroToHero(attacker, defender, options?)**: uses defender’s DEF (×1.1 if guarding). Used by the engine inside **actAttack**.

---

## 5. Player2AI (`src/battle/Player2AI.js`)

- **getAIAction(aiHero, enemies)**  
  - Returns `{ type: 'attack', targetId }`, `{ type: 'guard' }`, or `{ type: 'pass' }`.  
  - Uses **GUARD_HP_THRESHOLD** (0.4) to choose Guard when low HP; otherwise attacks first alive enemy.  
  - The **scene** maps this to `engine.actAttack(target)`, `engine.actGuard()`, or `engine.actPass()`.  
  - When the enemy active dies, the scene calls **selectNextEnemyHeroRandom()** (not the AI).

---

## 6. Scene driving the engine (BattleScene)

- **create**: Builds player/enemy teams, `new BattleEngine(playerTeam, enemyTeam)`, and all UI (party panel, command bar, switch window, etc.).
- **update** (each frame):
  1. If **isBattleOver()**: sync UI, schedule victory overlay, return.
  2. If **pendingEnemySwitch**: schedule delayed **selectNextEnemyHeroRandom()** and **enemyActiveUI.setHero(...)**, return.
  3. If **pendingPlayerSwitch**: show Switch Hero window, sync party panel, return (no tick).
  4. Otherwise: **engine.tick()**, sync active hero UIs, **partyPanel.sync()**, **commandBar** (instructions + button enabled state).
  5. If **currentTurnHero** is enemy: schedule delayed **\_executeAI()** (which calls getAIAction and then actAttack/actGuard/actPass).
- **Input**: A/D/Q and button clicks only trigger when it’s the player’s turn and not in switch phase; they call **actAttack** / **actGuard** / **requestVoluntarySwitch** (and for Switch, the window’s **onSelect** calls **selectNextPlayerHero**).

---

## 7. Data flow summary

```
BattleScene (update)
  → engine.tick()                    // advance ATB, set currentTurnHero
  → if player turn: accept A/D/Q and buttons
  → if enemy turn: _executeAI() → getAIAction() → actAttack/actGuard/actPass
  → on active KO: pendingPlayerSwitch or pendingEnemySwitch
  → player: Switch Hero window → selectNextPlayerHero(index)
  → enemy: selectNextEnemyHeroRandom()
  → victory when one team has no alive heroes
```
