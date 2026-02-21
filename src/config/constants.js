/**
 * Global game constants for Mini Hero Battle.
 * Centralized so tuning and new mechanics can be added in one place.
 */

/** ATB: charge needed (in points) before a hero can act */
export const MAX_CHARGE = 100;

/** How much charge is added per engine tick (scale SPD by this for feel) */
export const CHARGE_PER_TICK = 1;

/** Minimum damage any attack can deal */
export const MIN_DAMAGE = 0;

/** Default game dimensions (Phaser config) */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

/** Battle layout: horizontal padding for hero card areas */
export const BATTLE_PADDING = 100;
/** Approximate card width for placeholder layout */
export const CARD_WIDTH = 120;
export const CARD_HEIGHT = 160;
/** HP and ATB bar width (same for both so they align) */
export const HERO_BAR_WIDTH = 120;

/** Compact 8-bit style font for all game text */
export const GAME_FONT = '"Press Start 2P", monospace';

/** HeroUI (hero name + HP/ATB bars) — configure font and sizes here */
export const HERO_UI_FONT = GAME_FONT;
export const HERO_UI_FONT_SIZE_NAME = 8;   // hero name above card
export const HERO_UI_FONT_SIZE_BAR = 8;    // HP/ATB labels and values

/** Command window (Guard / Attack buttons) — configure font and size here */
export const COMMAND_WINDOW_FONT = GAME_FONT;
export const COMMAND_WINDOW_FONT_SIZE = 10;

/** Other font sizes (tune in one place) */
export const FONT_SIZE_DEBUG_UI = 8;   // debug window + feedback window
export const FONT_SIZE_TINY = 8;       // debug formula line
export const FONT_SIZE_DAMAGE_POP = 26; // floating damage number
export const FONT_SIZE_VICTORY = 28;   // victory message
