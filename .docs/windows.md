# Windows & UI Modules

All game windows and major UI components live in **`src/ui/`** (and **`src/entities/HeroUI.js`**). BattleScene composes them and passes callbacks or getters.

---

## 1. PartyPanel (`src/ui/PartyPanel.js`)

**Purpose**: Top bar showing both teams as small squares with an HP bar inside. Indicates which hero is active; player slots are clickable during switch phase.

**API**

- **Constructor**: `new PartyPanel(scene, options)` — getPlayerTeam, getEnemyTeam, getPlayerActive, getEnemyActive, isPendingPlayerSwitch, onPlayerSlotClick.
- **`sync()`** — Updates from engine state. Call every frame when battle is active.
- **`playIn()`** — Plays ease-in animation. Call once when battle UI is ready.

**Used in**: BattleScene create, update (sync), delayed playIn.

---

## 2. CommandBar (`src/ui/CommandBar.js`)

**Purpose**: Bottom bar with instructions and **Attack / Skill / Guard / Switch** buttons. Disabled when ATB filling, enemy turn, or when the skill window is open (scene sets instructions to "Choose a skill" and disables all).

**API**

- **Constructor**: `new CommandBar(scene, { onAttack, onGuard, onSwitch, onSkill })`
- **`setInstructions(text, subtext?)`** — Main line and subtext.
- **`setButtonsVisible(visible)`** — Show/hide all four buttons.
- **`setButtonsEnabled(enabled)`** — Dim and non-interactive when false.
- **`setGuardEnabled(enabled)`** — Guard only (e.g. disabled when staggered).
- **`setSkillEnabled(enabled)`** — Skill only (e.g. disabled when hero has no skills).

**Used in**: BattleScene _updateCommandBar; when _skillWindowOpen, all commands disabled.

---

## 3. SkillSelectionWindow (`src/ui/SkillSelectionWindow.js`)

**Purpose**: Modal "Choose skill" window. Shows **only the current hero's skills** (max 4). On select, invokes **onSelect(skillId)** and **onHide()**; Esc only calls **onHide()**. When open, the scene disables all commands to avoid spamming.

**API**

- **Constructor**: `new SkillSelectionWindow(scene, { onSelect, onHide? })`
  - **onSelect(skillId)** — Called when the player picks a skill (scene then runs actAttack with that skillId).
  - **onHide()** — Called when the window closes (selection or Esc); scene sets _skillWindowOpen = false.
- **`show(skillIds)`** — **skillIds**: array of skill IDs from hero config (sliced to MAX_SKILLS_PER_HERO). Resolves IDs to skills, shows up to 4 rows with name and "+X dmg, +Y% ATK". Keys 1–4, ↑↓, Enter, Esc.
- **`hide()`** — Calls onHide(), hides overlay/panel/rows, removes keyboard listener.

**Used in**: BattleScene; on Skill click or S key, scene sets _skillWindowOpen and calls show(currentHeroSkillIds). On select, _onSkillSelected(skillId); onHide clears _skillWindowOpen.

---

## 4. SwitchHeroWindow (`src/ui/SwitchHeroWindow.js`)

**Purpose**: Modal "Choose next hero" when the player must or chooses to switch. Keyboard (1/2/3, ↑↓, Enter) and mouse.

**API**

- **Constructor**: `new SwitchHeroWindow(scene, { getTeam, onSelect })`
- **`show()`** / **`hide()`** / **`sync()`** — As before.

**Used in**: BattleScene when pendingPlayerSwitch; onSelect calls selectNextPlayerHero and updates active UI.

---

## 5. DebugDamageLog (`src/ui/DebugDamageLog.js`)

**Purpose**: Scrollable "Damage (debug)" panel. Each entry is one line: **HeroName: Command (atk - def) [guard ×1.7] [stagger ×2] = damage**. Command is the skill name when a skill was used, otherwise "Attack". Scroll to bottom on new entry; **mouse wheel** and **arrow keys** (↑↓) to scroll.

**API**

- **Constructor**: `new DebugDamageLog(scene)`
- **`addEntry(result)`** — **result** must include `attacker`, `atk`, `effectiveDef`, `damage`; optional `guarded`, `targetWasStaggered`, `skill` (for command label). Appends one line and scrolls to bottom.

**Used in**: BattleScene after actAttack (player and AI); result includes **skill** when a skill was used.

---

## 6. GameResultScreen (`src/ui/GameResultScreen.js`)

**Purpose**: Full-width result panel with win/lose/draw and per-hero stats (attacks, damage dealt, damage received) for both teams. **Back to Lobby** button starts the Lobby scene.

**API**

- **Constructor**: `new GameResultScreen(scene)`
- **`show(winner, playerTeam, enemyTeam)`** — Shows overlay, title, two columns of hero rows and stats, and Back to Lobby button.
- **`hide()`** — Clears and hides.

**Used in**: BattleScene after battle over (delayed); Back to Lobby calls `this.scene.scene.start('Lobby')`.

---

## 7. VictoryOverlay (`src/ui/VictoryOverlay.js`)

**Purpose**: Legacy win/lose/draw text overlay. Result screen is the main post-battle UI.

**API**

- **Constructor**: `new VictoryOverlay(scene)`; **`show(winner)`**

---

## 8. CommandPop (`src/ui/CommandPop.js`)

**Purpose**: Short-lived bubble above a hero when they use a command (Attack!, Strike!, Guard!, etc.).

**API**

- **`showCommandPop(scene, x, y, label)`** — **label** e.g. `'Attack!'`, `'Strike!'`, `'Guard!'`. Pop-in and fade-out.

**Used in**: BattleScene on player Attack/Skill/Guard/Switch; _executeAI for enemy; skill name used when a skill is selected.

---

## 9. HeroUI (`src/entities/HeroUI.js`)

**Purpose**: Active-hero display: name, **HP bar**, **ATB bar**, **Stagger bar**, and **"STAGGERED!"** badge when staggered. One instance per side; scene rebinds hero when active changes.

**API**

- **Constructor**: `new HeroUI(scene, x, y, hero)`
- **`setHero(hero)`** — Rebind to another hero.
- **`sync()`** — Update bars and labels from hero state (including stagger, staggered). Call every frame.
- **`setVisible(visible)`** / **`destroy()`** — Visibility and cleanup.

**Used in**: BattleScene playerActiveUI, enemyActiveUI; setHero on switch, sync in update.

---

## 10. Summary table

| Module              | Role                                  | When shown / used |
|---------------------|----------------------------------------|--------------------|
| PartyPanel          | Team boxes + HP, switch click          | Top; sync every frame; playIn once |
| CommandBar          | Instructions + Attack/Skill/Guard/Switch | Bottom; disabled when skill window open or not player turn |
| SkillSelectionWindow| Choose skill (max 4 per hero)         | Modal on Skill/S; disables commands until closed |
| SwitchHeroWindow    | Choose next hero                      | Modal when pendingPlayerSwitch |
| DebugDamageLog      | Damage log (skill name, guard, stagger) | Scrollable; wheel/arrows; addEntry on attack |
| GameResultScreen    | Result + per-hero stats + Back to Lobby | After battle over (delayed) |
| VictoryOverlay      | Win/lose/draw text                    | Legacy |
| CommandPop          | "Attack!" / "Strike!" etc.            | On each command |
| HeroUI              | Active hero name, HP, ATB, stagger   | One per side; bound to current active |
