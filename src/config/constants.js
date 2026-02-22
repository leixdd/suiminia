/**
 * Global game constants for Mini Hero Battle.
 * Centralized so tuning and new mechanics can be added in one place.
 */

/** ATB: charge needed (in points) before a hero can act */
export const MAX_CHARGE = 100;

/** How much charge is added per engine tick (scale SPD by this for feel) */
export const CHARGE_PER_TICK = 1;

/** When a hero receives damage, their ATB bar is reduced by this ratio (0..1). 0.25 = lose 25% of the bar. */
export const ATB_DAMAGE_DRAWBACK = 0.001;

/** When a hero attacks, their ATB is set to this negative ratio of MAX_CHARGE, so they must fill more before acting again. 0.25 = start at -25%. */
export const ATTACKER_ATB_DRAWBACK = 0.25;

/** Minimum damage any attack can deal */
export const MIN_DAMAGE = 0;

/** When guarding, defender's DEF is multiplied by this value (e.g. 1.1 = +10% DEF). */
export const GUARD_DEF_MULTIPLIER = 1.7;

/** ATB drawback when attacked while guarding: defender loses this ratio of the bar (e.g. 0.05 = 5%). */
export const GUARD_ATB_DRAWBACK_WHEN_HIT = 0.05;

/** ATB drawback when guarding and not attacked (end turn with Guard): hero's ATB set to this negative ratio (e.g. 0.1 = -10%). */
export const GUARD_ATB_DRAWBACK_WHEN_NOT_HIT = 0.1;

/** Stagger: meter capacity (same scale as ATB for UI). When full, hero becomes Staggered (takes 200% damage). */
export const MAX_STAGGER = 100;
/** Stagger charge added when the hero is hit while guarding (per hit). */
export const STAGGER_CHARGE_PER_GUARD_HIT = 34;
/** Damage multiplier when target is Staggered (2 = 200% damage). */
export const STAGGERED_DAMAGE_MULTIPLIER = 2;

/** Default game dimensions (Phaser config) */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

/** Team size (Pokemon-style: up to 3 heroes per side, one active at a time) */
export const TEAM_SIZE = 3;
/** Minimum party size (player can fight with 1, 2, or 3 members) */
export const MIN_PARTY_SIZE = 1;

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
