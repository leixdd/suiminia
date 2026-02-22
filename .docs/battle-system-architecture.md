# Battle System Architecture

This document describes how the battle system is structured: engine, skills, stagger, turn queue, AI, switch phase, and how the scene drives it.

---

## 1. Overview

- **BattleEngine** owns both teams, active indices, **TurnQueue** (from the two actives only), victory/switch state, and applies damage (basic or skill power), stagger, and status.
- **TurnQueue** contains only the two currently active heroes; rebuilt when either side switches.
- **BattleScene** calls `tick()` every frame, reads `currentTurnHero`, and invokes `actAttack` (with optional `skillId`), `actGuard`, `actPass`, or switch APIs. When the **skill selection window** is open, all commands are disabled. When it's the enemy's turn, the scene runs the AI from **battle/ai** with per-hero behavior config.

---

## 2. BattleEngine (`src/battle/BattleEngine.js`)

### Constructor

```js
new BattleEngine(playerTeam, enemyTeam)
```

- **playerTeam** / **enemyTeam**: arrays of 3 `Hero` instances.
- Tracks **playerActiveIndex**, **enemyActiveIndex**, **currentTurnHero**, **victorId**, **pendingPlayerSwitch** / **pendingEnemySwitch**.

### Actions

- **`actAttack(targetHero, options?)`**
  - **options.skillId**: if set, resolve skill from `src/data/skills.js`, compute **effectiveAtk** = `getSkillPower(attacker.atk, skill)`, else use `attacker.atk`.
  - Effective DEF: target guarding → DEF × GUARD_DEF_MULTIPLIER; target staggered → damage multiplier 2×.
  - Damage via `DamageCalculator.calculate(effectiveAtk, effectiveDef, options)`.
  - Applies damage, ATB/stagger effects, clears attacker's staggered, consumes turn.
  - If target was guarding, adds **stagger** to target; if stagger ≥ MAX_STAGGER, target becomes Staggered and guard cleared.
  - Returns result including **skill** `{ id, name }` when a skill was used (for debug log).

- **`actGuard()`** — No-op if current hero is staggered. Otherwise current hero starts guarding, consumes turn, same tick/set currentTurnHero.

- **`actPass()`** — Current hero clears staggered and guard, consumes turn, same tick/set currentTurnHero.

### Voluntary switch and switch phase

- **`requestVoluntarySwitch()`** — Player's turn only; consumes turn, sets pendingPlayerSwitch.
- **`selectNextPlayerHero(index)`** / **`selectNextEnemyHeroRandom()`** — Resolve switch, rebuild turn queue, clear pending, tick until ready, set currentTurnHero.

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

- **create**: Builds teams, **playerPartyConfig** (for hero skills), **enemyTeamConfig** (for AI), engine, UI (CommandBar with Attack/Skill/Guard/Switch, **SkillSelectionWindow** with **onHide**), ** _skillWindowOpen** = false.
- **update** (each frame):
  1. If **isBattleOver()**: sync UI, schedule result screen, return.
  2. If **pendingEnemySwitch**: schedule selectNextEnemyHeroRandom, return.
  3. If **pendingPlayerSwitch**: show Switch Hero window, sync, return.
  4. **engine.tick()**, sync UIs, ** _updateCommandBar()**.
  5. If ** _skillWindowOpen**: command bar shows "Choose a skill", all buttons disabled; return (no A/S/D/Q).
  6. If **currentTurnHero** is enemy: schedule ** _executeAI()** (getAIAction with hero config, then actAttack/actGuard/actPass).
- **Input**: A/S/D/Q and buttons only when player turn, not switch phase, and **not** _skillWindowOpen. **S** or Skill button opens skill window and sets _skillWindowOpen; window **onHide** clears it. ** _onSkillSelected(skillId)** runs actAttack(target, { skillId }), adds log, damage pop.

---

## 7. Data flow summary

```
BattleScene (update)
  → if skill window open: disable commands, return
  → engine.tick()
  → if player turn: accept A/S/D/Q and buttons (or open skill window)
  → if skill selected: actAttack(target, { skillId })
  → if enemy turn: _executeAI() → getAIAction(..., hero config) → actAttack/actGuard/actPass
  → on active KO: pendingPlayerSwitch or pendingEnemySwitch
  → victory → GameResultScreen, Back to Lobby
```
