# Windows & UI Modules

All game windows and major UI components live in **`src/ui/`** (and **`src/entities/HeroUI.js`** for the active-hero display). The BattleScene composes them and passes callbacks or getters.

---

## 1. PartyPanel (`src/ui/PartyPanel.js`)

**Purpose**: Top bar showing both teams as small squares with an HP bar inside. Indicates which hero is active; player slots are clickable during switch phase.

**API**

- **Constructor**: `new PartyPanel(scene, options)`
  - **options**:  
    - `getPlayerTeam()`, `getEnemyTeam()` — return current team arrays  
    - `getPlayerActive()`, `getEnemyActive()` — return current active hero  
    - `isPendingPlayerSwitch()` — boolean  
    - `onPlayerSlotClick(index)` — called when the player clicks an alive slot during switch phase
- **`sync()`** — Updates names, HP bars, active border, and click handlers from current engine state. Call every frame when battle is active.
- **`playIn()`** — Plays the top-down ease-in animation for all boxes (staggered, one by one). Call once when the battle UI is ready (e.g. delayed after create).

**Used in**: BattleScene create (instantiate), update (sync), and a delayed call for playIn.

---

## 2. CommandBar (`src/ui/CommandBar.js`)

**Purpose**: Bottom bar with feedback text (instructions + subtext) and Attack / Guard / Switch buttons. Shows disabled state when ATB is filling or it’s not the player’s turn.

**API**

- **Constructor**: `new CommandBar(scene, { onAttack, onGuard, onSwitch })`
- **`setInstructions(text, subtext?)`** — Sets main line and subtext (e.g. “Your turn”, “A Attack · D Guard · Q Switch”).
- **`setButtonsVisible(visible)`** — Show or hide the three buttons (e.g. hide when battle over).
- **`setButtonsEnabled(enabled)`** — When false: buttons dimmed (alpha 0.45) and not clickable; when true: full opacity and interactive. Used while ATB is filling or enemy turn.

**Used in**: BattleScene create (instantiate with callbacks); update via _updateCommandBar (setInstructions, setButtonsVisible, setButtonsEnabled).

---

## 3. SwitchHeroWindow (`src/ui/SwitchHeroWindow.js`)

**Purpose**: Modal “Choose next hero” window when the player must or chooses to switch. Shows list of heroes with stats panel on the side; supports keyboard (1/2/3, ↑↓, Enter) and mouse.

**API**

- **Constructor**: `new SwitchHeroWindow(scene, { getTeam, onSelect })`
  - **getTeam()** — Returns the player team array (for labels and HP).
  - **onSelect(index)** — Called when the player confirms a hero (scene then calls engine.selectNextPlayerHero(index) and updates active UI).
- **`show()`** — Shows overlay, panel, rows, and stats; sets selection to first alive; registers keyboard listener.
- **`hide()`** — Hides all elements and removes keyboard listener.
- **`sync()`** — Refreshes row labels/HP and selection highlight from getTeam(). Call every frame while the window is open.

**Used in**: BattleScene create (instantiate); update shows and syncs when pendingPlayerSwitch, hides otherwise. Window calls onSelect then hide() on confirm.

---

## 4. DebugDamageLog (`src/ui/DebugDamageLog.js`)

**Purpose**: Scrollable “Damage (debug)” panel that logs each attack with formula (ATK, DEF, guard, final damage).

**API**

- **Constructor**: `new DebugDamageLog(scene)`
- **`addEntry(result)`** — Appends one damage log entry. **result** should include at least `attacker`, `target`, `atk`, `effectiveDef`, `damage`, optional `guarded`, `baseDef`. Scrolls so the latest entry is in view.

**Used in**: BattleScene create (instantiate); _onAttackClicked and _executeAI call debugDamageLog.addEntry(result) after actAttack.

---

## 5. VictoryOverlay (`src/ui/VictoryOverlay.js`)

**Purpose**: Shows the battle result text (“You win!” / “Enemy wins!” / “Draw!”).

**API**

- **Constructor**: `new VictoryOverlay(scene)`
- **`show(winner)`** — **winner**: `'player' | 'enemy' | null`. Sets and shows the corresponding message.

**Used in**: BattleScene create (instantiate); after battle over, a delayed call runs victoryOverlay.show(engine.getVictor()).

---

## 6. CommandPop (`src/ui/CommandPop.js`)

**Purpose**: Short-lived “shout” bubble above a hero when they use a command (Attack!, Guard!, Switch!, Pass!). Pop-in and fade-out animation.

**API**

- **`showCommandPop(scene, x, y, label)`** — **x, y**: world position (e.g. hero card center). **label**: e.g. `'Attack!'`, `'Guard!'`, `'Switch!'`, `'Pass!'`. Creates a bubble and text, plays pop-in (Back.easeOut), holds, then fades out and destroys.

**Used in**: BattleScene: _onAttackClicked / _onGuardClicked / _onSwitchClicked (player card); _executeAI (enemy card, label from AI action type).

---

## 7. HeroUI (`src/entities/HeroUI.js`)

**Purpose**: Single active-hero display: name, HP bar, ATB bar. One instance per side (player active, enemy active); the scene rebinds the hero when the active changes.

**API**

- **Constructor**: `new HeroUI(scene, x, y, hero)` — **hero**: the Hero instance to display.
- **`setHero(hero)`** — Rebind to another hero (used when switching active).
- **`sync()`** — Update bars and labels from current hero state. Call every frame.
- **`setVisible(visible)`** / **`destroy()`** — Standard visibility and cleanup.

**Used in**: BattleScene: playerActiveUI and enemyActiveUI at card positions; setHero when active changes, sync in update.

---

## 8. Summary table

| Module           | Role                         | When shown / used                          |
|-----------------|------------------------------|--------------------------------------------|
| PartyPanel      | Team boxes + HP, switch click | Top of screen; sync every frame; playIn once |
| CommandBar      | Instructions + Attack/Guard/Switch | Bottom; visible when battle not over; enabled only on player turn |
| SwitchHeroWindow| Choose next hero             | Modal when pendingPlayerSwitch             |
| DebugDamageLog  | Damage formula log           | Always visible during battle; addEntry on attack |
| VictoryOverlay  | Win/lose/draw text           | After battle over (delayed)                 |
| CommandPop      | “Attack!” etc. bubble        | On each command (player or AI)             |
| HeroUI          | Active hero name/HP/ATB      | One per side; bound to current active      |
