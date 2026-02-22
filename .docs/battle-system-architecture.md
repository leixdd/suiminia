# Battle System Architecture

This document describes how the battle system is structured: engine, skills, stagger, turn queue, AI, switch phase, and how the scene drives it.

---

## 1. Overview

- **BattleEngine** owns both teams, active indices, **TurnQueue** (from the two actives only), victory/switch state, and applies damage (basic or skill power), stagger, and status. Staggered heroes never receive the turn: they are skipped (clear stagger + consume turn) so the other side is not blocked.
- **TurnQueue** contains only the two currently active heroes; rebuilt when either side switches.
- **BattleScene** calls `tick()` every frame, reads `currentTurnHero`, and invokes `actAttack` (with optional `skillId`), `actGuard`, `actPass`, **actSkip** (pass), or switch APIs. When the **skill selection** or **switch hero** window is open, **Esc** closes it without pausing the game (capture-phase listener). When it's the enemy's turn, the scene runs the AI from **battle/ai** with per-hero behavior config.

---

## 2. BattleEngine (`src/battle/BattleEngine.js`)

### Constructor

```js
new BattleEngine(playerTeam, enemyTeam)
```

- **playerTeam** / **enemyTeam**: arrays of 3 `Hero` instances.
- Tracks **playerActiveIndex**, **enemyActiveIndex**, **currentTurnHero**, **victorId**, **pendingPlayerSwitch** / **pendingEnemySwitch**.

### Turn and stagger

- **`tick()`** — If no one has the turn, advances TurnQueue; if the ready hero is **staggered**, calls `clearStaggered()` and `consumeTurn()` on them (they lose the turn and recover), sets `currentTurnHero = null`; otherwise sets `currentTurnHero` to the ready hero.
- **`_getNextTurnHero()`** — Used after every action (attack, guard, pass, switch). Advances time with `tickUntilReady()`; if the ready hero is staggered, clears their stagger and consumes their turn, then repeats until a **non-staggered** hero is ready (or null). Ensures the next turn is never given to a staggered hero (e.g. enemy stagger does not block the player).

### Actions

- **`actAttack(targetHero, options?)`**
  - **No-op** if `currentTurnHero` is staggered (returns `{ damage: 0, targetAlive }`).
  - **options.skillId**: if set, resolve skill from `src/data/skills.js`, compute **effectiveAtk** = `getSkillPower(attacker.atk, skill)`, else use `attacker.atk`.
  - Effective DEF: target guarding → DEF × GUARD_DEF_MULTIPLIER; target staggered → damage multiplier 1.2× (120% damage).
  - Damage via `DamageCalculator.calculate(effectiveAtk, effectiveDef, options)`.
  - Applies damage, ATB/stagger effects, clears attacker's staggered, consumes turn.
  - If target was guarding, adds **stagger** to target; if stagger ≥ MAX_STAGGER, target becomes Staggered, ATB reset to 0, guard cleared.
  - After action, next turn is set via **`_getNextTurnHero()`** (skipping any staggered ready hero).
  - Returns result including **skill** `{ id, name }` and **hitDamages** when a multi-hit skill was used (for damage pops).

- **`actGuard()`** — No-op if current hero is staggered. Otherwise current hero starts guarding, consumes turn; next turn via `_getNextTurnHero()`.

- **`actPass()`** — Current hero clears staggered and guard, consumes turn; next turn via `_getNextTurnHero()`.

### Voluntary switch and switch phase

- **`requestVoluntarySwitch()`** — Player's turn only; sets pendingPlayerSwitch (turn consumed on select).
- **`selectNextPlayerHero(index)`** / **`selectNextEnemyHeroRandom()`** — Resolve switch, rebuild turn queue, clear pending; next turn via `_getNextTurnHero()`.

### Victory

- **`isBattleOver()`** / **`getVictor()`** / **`_checkVictory()`** — As before.

---

## 3. TurnQueue (`src/battle/TurnQueue.js`)

Unchanged: two actives, tick(), getCurrentTurn(), tickUntilReady(). Engine rebuilds queue on switch.

---

## 4. DamageCalculator (`src/battle/DamageCalculator.js`)

- **calculate(atk, def, options?)**: `max(MIN_DAMAGE, max(0, atk - def) × multiplier)`. When using a skill, **atk** is the skill power from `getSkillPower(attacker.atk, skill)`.

---

## 5. AI (`src/battle/ai/`)

- **getAIAction(aiHero, enemies, options)** (from `ai/index.js`):
  - **options.behavior**: `'aggressive' | 'defensive' | 'balanced'` (default aggressive).
  - **options.actionRatio**: `{ attack?, guard? }` for balanced/defensive.
  - **options.lastAction**: `'attack' | 'guard' | 'pass'` for defensive alternating.
  - Dispatches to **aggressive.js**, **defensive.js**, or **balanced.js**; returns `{ type, targetId? }`.
- **Scene**: Stores **enemyTeamConfig** (from Lobby); for current enemy hero gets config by index and passes **behavior**, **actionRatio**, **lastAction** (per-hero **lastEnemyActionByHero**). After AI acts, stores action type for that hero.

---

## 6. Scene driving the engine (BattleScene)

- **create**: Builds teams, **playerPartyConfig** (for hero skills), **enemyTeamConfig** (for AI), engine, UI (CommandBar with **Skip**, Attack, Skill, Guard, Switch; **SkillSelectionWindow** and **SwitchHeroWindow** with **Esc** capture-phase so game does not pause), ** _skillWindowOpen** = false.
- **update** (each frame):
  1. If **isBattleOver()**: sync UI, schedule result screen, return.
  2. If **pendingEnemySwitch**: schedule selectNextEnemyHeroRandom, return.
  3. If **pendingPlayerSwitch**: show Switch Hero window, sync, return.
  4. **engine.tick()**, sync UIs, ** _updateCommandBar()** (Attack/Skill/Guard disabled when player active is staggered).
  5. If ** _skillWindowOpen**: command bar shows "Choose a skill", all buttons disabled; return (no A/S/D/Q/P).
  6. If **currentTurnHero** is enemy: schedule ** _executeAI()** (getAIAction with hero config, then actAttack/actGuard/actPass).
- **Input**: A/S/D/Q/**P** and buttons only when player turn, not switch phase, and **not** _skillWindowOpen. **P** or Skip button = pass (actPass). **S** or Skill opens skill window; **Esc** in skill or switch window closes it (capture-phase). ** _onSkillSelected(skillId)** runs actAttack(target, { skillId }), adds log, damage pops (per-hit and total for multi-hit skills).

---

## 7. Data flow summary

```
BattleScene (update)
  → if skill window open: disable commands, return
  → engine.tick()  [staggered ready hero: clearStaggered + consumeTurn, no currentTurnHero]
  → if player turn: accept A/S/D/Q/P and buttons (or open skill window); Attack/Skill/Guard disabled if player staggered
  → if skill selected: actAttack(target, { skillId }); damage pops (per-hit + total for multi-hit)
  → if enemy turn: _executeAI() → getAIAction(..., hero config) → actAttack/actGuard/actPass
  → after any action: _getNextTurnHero() (skip staggered ready heroes)
  → on active KO: pendingPlayerSwitch or pendingEnemySwitch
  → victory → GameResultScreen, Back to Lobby
```
