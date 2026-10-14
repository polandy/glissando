/**
 * The veil's look (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Look): at a given `amount`, mix
 * the picture toward its blurred backdrop, desaturate, pull contrast toward mid-grey, then mix
 * toward the card's tint — each step scaled by one of these shares times `amount`. Shared between
 * the DOM renderer (`dom/dom-card.ts`, as CSS filters) and the WebGL renderer (`webgl/transition-shaders.ts`,
 * as a GLSL function) so both apply the same look.
 */
export const VEIL_SATURATION_SHARE = 0.6;
export const VEIL_CONTRAST_SHARE = 0.35;
export const VEIL_TINT_OPACITY_SHARE = 0.35;
