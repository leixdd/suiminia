# Game Logic — Mini Hero Battle

This document describes the core game logic: constants, entities, combat math, stagger/status, skills, turn system, teams, AI, and victory.

---

## 1. Constants (`src/config/constants.js`)

| Constant | Value | Meaning |
|----------|--------|---------|
| `MAX_CHARGE` | 100 | ATB charge (points) needed before a hero can act |
| `CHARGE_PER_TICK` | 1 | Charge gain per tick: `charge += SPD × CHARGE_PER_TICK` |
| `MIN_DAMAGE` | 0 | Minimum damage any attack can deal |
| `GUARD_DEF_MULTIPLIER` | 1.7 | When guarding, defender's DEF is multiplied by this |
| `GUARD_ATB_DRAWBACK_WHEN_HIT` | 0.05 | When attacked while guarding, defender loses an extra 5% of the ATB bar |
| `GUARD_ATB_DRAWBACK_WHEN_NOT_HIT` | 0.1 | When guarding and not attacked, hero's ATB set to -10% |
| `MAX_STAGGER` | 100 | Stagger meter capacity; when full, hero becomes Staggered |
| `STAGGER_CHARGE_PER_GUARD_HIT` | 34 | Stagger charge added when hit while guarding (per hit) |
| `STAGGERED_DAMAGE_MULTIPLIER` | 2 | Damage multiplier when target is Staggered (200%) |
| `TEAM_SIZE` | 3 | Heroes per team |
| `ATB_DAMAGE_DRAWBACK` | 0.001 | When a hero receives damage, ATB reduced by this ratio |
| `ATTACKER_ATB_DRAWBACK` | 0.25 | When a hero attacks, ATB set to -25% of bar |
| `GAME_WIDTH` / `GAME_HEIGHT` | 800 / 600 | Canvas size |
| `BATTLE_PADDING`, `CARD_*`, `HERO_BAR_WIDTH` | — | Layout and bar dimensions |
| `GAME_FONT` | "Press Start 2P" | Default font |

---

## 2. Hero Entity (`src/entities/Hero.js`)

Single combat unit: stats, HP, ATB charge, guard state, and stagger.

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
- **guarding**: When true, incoming damage uses DEF × GUARD_DEF_MULTIPLIER until the hero's next action. **Disabled while staggered.**
- **stagger** (0..MAX_STAGGER): Stagger meter; fills when hit while guarding.
- **staggered**: When true, hero takes STAGGERED_DAMAGE_MULTIPLIER (200%) damage and cannot guard until they act.

### Methods

| Method | Description |
|--------|-------------|
| `isReady()` | `alive && charge >= MAX_CHARGE` |
| `consumeTurn()` | Sets `charge = 0` (after acting) |
| `startGuarding()` | Sets `guarding = true` (cannot use when staggered) |
| `clearGuarding()` | Sets `guarding = false` |
| `addStagger(amount)` | Adds to stagger; if ≥ MAX_STAGGER, sets staggered and clears guard |
| `clearStaggered()` | Clears staggered (e.g. when hero acts) |
| `staggerProgress()` | Returns stagger as 0..1 for UI |
| `takeDamage(amount)` | Applies damage, updates `currentHp` and `alive` |
| `heal(amount)` | Increases `currentHp` up to `maxHp` |
| `chargeProgress()` | Returns charge as 0..1 for UI |

---

## 3. Damage (`src/battle/DamageCalculator.js`)

### Basic formula

```
raw   = max(0, ATK - DEF)
base  = max(MIN_DAMAGE, raw)
final = max(MIN_DAMAGE, base × multiplier)
```

With guard: defender uses **DEF × GUARD_DEF_MULTIPLIER** (1.7).  
With **Staggered** target: `multiplier` includes **STAGGERED_DAMAGE_MULTIPLIER** (2).

### Skill damage (`src/data/skills.js`)

Skill **power** (effective ATK before DEF):

```
power = (ATK + SkillDamage) + (ATK × damageMultiplier)
```

Then `DamageCalculator.calculate(power, effectiveDef, options)` gives final damage. Each skill has `skillDamage` (flat) and `damageMultiplier` (e.g. 0.2 = +20% ATK). Heroes have up to **MAX_SKILLS_PER_HERO** (4) skills in config.

### ATB / guard drawbacks

- **Defender hit**: ATB reduced by `ATB_DAMAGE_DRAWBACK`; if guarding, extra `GUARD_ATB_DRAWBACK_WHEN_HIT` and **stagger charge**.
- **Attacker**: After attacking, ATB set to `-ATTACKER_ATB_DRAWBACK` of bar.
- **Guard (not hit)**: After acting with Guard, ATB set to `-GUARD_ATB_DRAWBACK_WHEN_NOT_HIT`.

---

## 4. Status system (`src/battle/StatusSystem.js`)

- **STATUS_STAGGERED**: Hero takes increased damage (see `getDamageTakenMultiplier('staggered')` = 2). Cleared when the hero acts (attack, guard, pass, switch).

---

## 5. Stagger

- **Charge**: When a hero is **hit while guarding**, they gain **STAGGER_CHARGE_PER_GUARD_HIT** stagger. When stagger ≥ MAX_STAGGER, they become **Staggered** and the meter resets; guard is cleared.
- **Effect**: Staggered hero takes **200%** damage and **cannot guard** (Guard button disabled, actGuard no-op, AI does not choose Guard).
- **Clear**: When the hero takes any action (attack, skill, guard, pass, switch), `clearStaggered()` is called.

---

## 6. Turn Queue — ATB (`src/battle/TurnQueue.js`)

- **`new TurnQueue(heroes)`** — `heroes`: active heroes only (player active, enemy active).
- **`tick()`** — Each alive hero gains charge; capped at MAX_CHARGE.
- **`getCurrentTurn()`** — First ready hero, or `null`.
- **`tickUntilReady(maxTicks?)`** — Tick until someone is ready.

---

## 7. Teams and active hero

- Each side has **TEAM_SIZE** (3) heroes. **One active per side**; only actives are in the turn queue and can be targeted.
- When the **active** dies, that side enters **switch phase** (player via UI, AI at random).
- **Voluntary switch**: Player can choose "Switch" (uses the turn) and pick the next active.

---

## 8. Victory and battle end

- Battle ends when **one team has no alive heroes**.
- **Victor**: `'player'` or `'enemy'`; result screen shows per-hero stats and **Back to Lobby**.

---

## 9. AI (`src/battle/ai/`)

- **`getAIAction(aiHero, enemies, options)`** (from `ai/index.js`) dispatches by **options.behavior** (and uses **options.actionRatio**, **options.lastAction** where needed).
- **Behaviors**:
  - **aggressive**: Always attack.
  - **defensive**: 80–100% HP: alternate guard/attack; &lt;80%: 60% guard (or actionRatio); ≤30%: 100% guard; when staggered, attack.
  - **balanced**: Pick attack or guard by **actionRatio** (default 50/50); when staggered, attack.
- **Per-hero config**: In enemy team data, each hero can have `behavior` and `actionRatio: { attack?, guard? }`. Scene passes current enemy hero's config and **lastAction** (for defensive alternating).

---

## 10. Player input

- **Commands** (player's turn, not in switch phase, skill window closed):
  - **A** → Attack (basic)
  - **S** → Skill (opens skill selection; choose one to attack with that skill)
  - **D** → Guard (disabled when staggered)
  - **Q** → Switch (voluntary)
- **Skill window open**: All command buttons and A/S/D/Q are disabled; only skill window keys (1–4, ↑↓, Enter, Esc) work.
- Buttons (Attack / Skill / Guard / Switch) mirror keys; disabled when ATB filling, enemy turn, or no skills (Skill).
- **Switch phase**: Player picks next hero via Switch Hero window (1/2/3, arrows+Enter, or click).

---

## 11. Scene flow (summary)

- **Boot** → **Preload** → **Title** → **Lobby** → **Battle**.
- Battle: two teams, engine with actAttack (optional skillId), actGuard, actPass, switch; stagger and status applied in engine.
- Each frame: tick, sync UI, update command bar (disable all when skill window open); if player turn and not skill window, accept A/S/D/Q and buttons; if enemy turn, run AI.
- Victory: result screen with **Back to Lobby**.
