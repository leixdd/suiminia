# Game Logic — Mini Hero Battle

This document describes the core game logic: constants, entities, combat math, turn system, teams, and victory.

---

## 1. Constants (`src/config/constants.js`)

| Constant | Value | Meaning |
|----------|--------|---------|
| `MAX_CHARGE` | 100 | ATB charge (points) needed before a hero can act |
| `CHARGE_PER_TICK` | 1 | Charge gain per tick: `charge += SPD × CHARGE_PER_TICK` |
| `MIN_DAMAGE` | 0 | Minimum damage any attack can deal |
| `GUARD_DEF_MULTIPLIER` | 1.1 | When guarding, defender's DEF is multiplied by this (+10% DEF) |
| `TEAM_SIZE` | 3 | Heroes per team (Pokémon-style) |
| `ATB_DAMAGE_DRAWBACK` | 0.25 | When a hero receives damage, their ATB bar is reduced by this ratio (25% of the bar) |
| `ATTACKER_ATB_DRAWBACK` | 0.25 | When a hero attacks, their ATB is set to this negative ratio of the bar (must fill from -25% to 100%) |
| `GAME_WIDTH` | 800 | Canvas width |
| `GAME_HEIGHT` | 600 | Canvas height |
| `BATTLE_PADDING` | 100 | Horizontal padding for hero card areas |
| `CARD_WIDTH` / `CARD_HEIGHT` | 120 / 160 | Placeholder card size |
| `HERO_BAR_WIDTH` | 120 | HP/ATB bar width |
| `GAME_FONT` | "Press Start 2P" | Default font |

---

## 2. Hero Entity (`src/entities/Hero.js`)

Single combat unit: stats, HP, ATB charge, and guard state.

### Constructor options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique id (e.g. `'player1'`, `'enemy2'`) |
| `name` | string | Display name |
| `atk` | number | Attack value |
| `def` | number | Defense (subtracted from incoming damage) |
| `spd` | number | Speed; ATB charge rate (clamped ≥ 1) |
| `maxHp` | number | Max HP (default 100) |
| `currentHp` | number | Current HP (defaults to maxHp) |

### Instance state

- **charge** (0..MAX_CHARGE): ATB progress; at MAX_CHARGE the hero can act.
- **alive**: `currentHp > 0`.
- **guarding**: When true, incoming damage uses DEF × GUARD_DEF_MULTIPLIER until the hero’s next action.

### Methods

| Method | Description |
|--------|-------------|
| `isReady()` | `alive && charge >= MAX_CHARGE` |
| `consumeTurn()` | Sets `charge = 0` (after acting) |
| `startGuarding()` | Sets `guarding = true` (DEF × GUARD_DEF_MULTIPLIER) |
| `clearGuarding()` | Sets `guarding = false` |
| `takeDamage(amount)` | Applies damage, updates `currentHp` and `alive` |
| `heal(amount)` | Increases `currentHp` up to `maxHp` |
| `chargeProgress()` | Returns charge as 0..1 for UI |

---

## 3. Damage (`src/battle/DamageCalculator.js`)

Single formula for all damage.

### Formula

```
raw   = max(0, ATK - DEF)
base  = max(MIN_DAMAGE, raw)
final = max(MIN_DAMAGE, base × multiplier)
```

With guard: defender uses **DEF × GUARD_DEF_MULTIPLIER** (e.g. 1.1 = +10%) instead of DEF.

### ATB damage drawback (defender)

When a hero **receives** damage, their ATB charge is reduced by **25% of the bar** (configurable via `ATB_DAMAGE_DRAWBACK`). So: `charge = max(0, charge - MAX_CHARGE × ATB_DAMAGE_DRAWBACK)`. This only affects the ATB bar, not HP or other stats.

### ATB drawback (attacker)

When a hero **attacks**, their ATB is set to a **negative** value: `charge = -MAX_CHARGE × ATTACKER_ATB_DRAWBACK` (e.g. -25% of the bar). They must then fill from that value back up to MAX_CHARGE before acting again, so attacking delays their next turn. Guard and Pass do not apply this penalty (they still use the normal consumeTurn() to 0).

### API

- **`DamageCalculator.calculate(atk, def, options?)`**  
  - `options.multiplier`: optional (default 1).  
  - Returns final damage (≥ MIN_DAMAGE).

- **`DamageCalculator.fromHeroToHero(attacker, defender, options?)`**  
  - Uses attacker ATK and defender effective DEF (×1.1 if guarding).

---

## 4. Turn Queue — ATB (`src/battle/TurnQueue.js`)

Turn order by ATB: charge fills over time; whoever reaches MAX_CHARGE first acts.

- **`new TurnQueue(heroes)`** — `heroes`: array of **active** heroes only (e.g. two: player active, enemy active).
- **`tick()`** — For each alive hero: `charge = min(MAX_CHARGE, charge + spd × CHARGE_PER_TICK)`.
- **`getReady()`** — Heroes with `isReady()`, sorted by charge (desc), then SPD (desc).
- **`getCurrentTurn()`** — First ready hero, or `null`.
- **`tickUntilReady(maxTicks?)`** — Repeatedly `tick()` until someone is ready (or max ticks).

---

## 5. Teams and active hero

- Each side has **TEAM_SIZE** (3) heroes.
- Only **one hero per side** is “active” at a time; only actives are in the turn queue and can be targeted.
- When the **active** hero dies, that side enters a **switch phase**: they must choose the next active (player via UI, AI at random).
- **Voluntary switch**: On the player’s turn they can choose “Switch” (uses the turn); they then pick the next active from the same team.

---

## 6. Victory and battle end

- Battle ends when **one team has no alive heroes**.
- **Victor**: `'player'` or `'enemy'`; if both wiped, treat as draw (`null`).

---

## 7. AI (`src/battle/Player2AI.js`)

- **`getAIAction(aiHero, enemies)`**  
  - Returns `{ type: 'attack', targetId }`, `{ type: 'guard' }`, or `{ type: 'pass' }`.
  - If AI HP ratio ≤ **GUARD_HP_THRESHOLD** (0.4), prefers Guard.
  - Otherwise attacks first alive enemy.
  - When the enemy active dies, the **scene** calls `engine.selectNextEnemyHeroRandom()` to pick the next active at random.

---

## 8. Player input

- **Commands** (when it’s the player’s turn and not in switch phase):
  - **A** → Attack  
  - **D** → Guard  
  - **Q** → Switch (voluntary)
- Buttons (Attack / Guard / Switch) mirror these; they are **disabled** (dimmed, not clickable) when ATB is filling or it’s the enemy’s turn.
- During **switch phase** (after KO or voluntary Switch), the player picks the next hero via the Switch Hero window (1/2/3, arrows+Enter, or click).

---

## 9. Scene flow (summary)

- **Boot** → **Preload** → **Battle**.
- Battle: two teams of 3 heroes, engine with `playerTeam` / `enemyTeam`, active indices, turn queue from actives only.
- Each frame: if not over and not in switch phase, `engine.tick()`; sync UI; if player turn, accept A/D/Q and button clicks; if enemy turn, run AI after a short delay.
- When active dies: set `pendingPlayerSwitch` or `pendingEnemySwitch`; scene shows switch UI or calls `selectNextEnemyHeroRandom()`; after switch, battle continues.
- Victory: when one team has no alive heroes, show victory overlay (“You win!” / “Enemy wins!” / “Draw!”).

This is the game logic as implemented in the codebase.
