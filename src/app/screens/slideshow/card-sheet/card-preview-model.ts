import type { CardColour, CardTint, StoredCard } from "../../../../library/stored-slideshow";
import { CARD_SWATCHES, type CardSwatchId, inkFor } from "../../../../player/card-palette";
import type { CardDeclarations } from "../../../../player/card-style";
import { CARD_ENTER_MS, CARD_REVEAL_MS, CARD_VEIL_MS } from "../../../../player/card-timing";
import type { Card, CardInk } from "../../../../player/slideshow";
import type { PictureTile } from "../../view-models";

/**
 * Turns a stored title/closing card into the player's own `Card`, and the moments the editor's
 * preview and tile still read it at (TITLE_SLIDES.md, "A change updates the preview in place").
 * Pure: no DOM, no canvas, so it is unit-tested directly.
 */

/** The card has fully entered and its veil has fully settled, before any reveal starts. */
export const CARD_PREVIEW_SETTLED_MS = Math.max(CARD_ENTER_MS, CARD_VEIL_MS);
/** Play holds here, settled, before a Reveal or Fade in starts. */
export const CARD_PREVIEW_HOLD_MS = CARD_PREVIEW_SETTLED_MS + 400;
/** How long Play takes to run a card with motion on, start to finish. */
export const CARD_PREVIEW_PLAY_MS = CARD_PREVIEW_HOLD_MS + CARD_REVEAL_MS;

export interface PreviewFace {
  readonly card: Card;
  /** A plain colour background; absent when `pictureId` is the background instead. */
  readonly ground?: string;
  readonly pictureId?: string;
}

/** `card` as the player draws it, and what fills behind it: a colour or one of the pictures. */
export function previewFace(card: StoredCard, pictures: readonly PictureTile[]): PreviewFace {
  if (card.background.kind === "colour") {
    const ground = groundColourOf(card.background.colour);
    return { card: faceOf(card, inkFor(ground), {}), ground };
  }
  const { pictureId, fade, tint } = card.background;
  const veilColour = veilColourFor(tint, pictures, pictureId);
  const veil = { amount: fade / 100, tint: veilColour };
  const extra: Partial<Pick<Card, "veil" | "revealAtMs">> = card.motion
    ? { veil, revealAtMs: CARD_PREVIEW_HOLD_MS }
    : { veil };
  return {
    card: faceOf(card, inkFor(veilColour), extra),
    pictureId,
  };
}

/** A colour background's ground: a swatch's hex by id, or a picture-derived hex used as-is. */
function groundColourOf(colour: CardColour): string {
  return isCardSwatchId(colour) ? CARD_SWATCHES[colour] : colour;
}

function isCardSwatchId(colour: CardColour): colour is CardSwatchId {
  return colour in CARD_SWATCHES;
}

/**
 * A picture background's veil tint (TITLE_CARD_COMPOSITION.md). The card sheet only ever
 * previews a card whose pictures are already loaded, so a `picture` tint whose `pictureId` is
 * not among `pictures` is an impossible state, not a style to fall back from.
 */
function veilColourFor(
  tint: CardTint,
  pictures: readonly PictureTile[],
  pictureId: string,
): string {
  switch (tint) {
    case "picture": {
      const picture = pictures.find((candidate) => candidate.id === pictureId);
      if (picture === undefined) {
        throw new Error(`card background names picture "${pictureId}", not one of the preview's`);
      }
      return picture.colours.veil;
    }
    case "light":
      return CARD_SWATCHES.cream;
    case "dark":
      return CARD_SWATCHES.plum;
  }
}

function faceOf(
  card: StoredCard,
  ink: CardInk,
  extra: Partial<Pick<Card, "veil" | "revealAtMs">>,
): Card {
  return {
    title: card.title,
    ...(card.subtitle === undefined ? {} : { subtitle: card.subtitle }),
    style: card.style,
    position: card.position,
    ink,
    entrance: card.entrance,
    ...(extra.veil === undefined ? {} : { veil: extra.veil }),
    ...(extra.revealAtMs === undefined ? {} : { revealAtMs: extra.revealAtMs }),
  };
}

/** `declarations` as one inline `style` attribute string, camelCase keys turned to kebab-case. */
export function styleAttr(declarations: CardDeclarations): string {
  return Object.entries(declarations)
    .map(([key, value]) => `${kebabCase(key)}: ${value}`)
    .join("; ");
}

/** `declarations.transform` with the card's current drift added, as the renderers add it. */
export function withDrift(declarations: CardDeclarations, driftEm: number): CardDeclarations {
  return { ...declarations, transform: `${declarations.transform} translateY(${driftEm}em)` };
}

function kebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** `pictureId`'s thumbnail among `pictures`; undefined once it is no longer one of them. */
export function pictureUrlFor(
  pictures: readonly PictureTile[],
  pictureId: string,
): string | undefined {
  return pictures.find((picture) => picture.id === pictureId)?.thumbnailUrl;
}
