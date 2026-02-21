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
export const BATTLE_PADDING = 80;
/** Approximate card width for placeholder layout */
export const CARD_WIDTH = 120;
export const CARD_HEIGHT = 160;
/** HP and ATB bar width (same for both so they align) */
export const HERO_BAR_WIDTH = 120;
