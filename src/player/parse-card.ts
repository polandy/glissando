import { CARD_ENTER_MS, CARD_REVEAL_MS } from "./card-timing";
import {
  readCaptionLike,
  readHexColor,
  readNonNegativeInteger,
  readObject,
  readOneOf,
  readUnitInterval,
  SlideshowFormatError,
} from "./parse-primitives";
import {
  CARD_INKS,
  CARD_POSITIONS,
  CARD_STYLES,
  type Card,
  type CardInk,
  type CardPosition,
  type CardStyle,
} from "./slideshow";

/** A title card's own fields, split out of `parse-slideshow.ts` to keep that file under the line limit. */

/**
 * A title or closing card. `allowPictureOnly` gates `veil`/`revealAtMs` (picture slides only,
 * TITLE_CARDS.md § Contract) by leaving them off the allowed-key list for a ground slide's card,
 * so an attempt on a ground slide fails loud as an unknown key, same as `image` on a ground slide.
 */
export function readCard(
  value: unknown,
  path: string,
  slideDurationMs: number,
  allowPictureOnly: boolean,
): Card {
  const keys = allowPictureOnly
    ? ["title", "subtitle", "style", "position", "ink", "veil", "enterAtMs", "revealAtMs"]
    : ["title", "subtitle", "style", "position", "ink", "enterAtMs"];
  const card = readObject(value, path, keys);
  const enterAtMs =
    card.enterAtMs === undefined
      ? undefined
      : readNonNegativeInteger(card.enterAtMs, `${path}.enterAtMs`);
  return {
    title: readCaptionLike(card.title, `${path}.title`),
    ...(card.subtitle === undefined
      ? {}
      : { subtitle: readCaptionLike(card.subtitle, `${path}.subtitle`) }),
    style: readOneOf<CardStyle>(card.style, `${path}.style`, CARD_STYLES),
    position: readOneOf<CardPosition>(card.position, `${path}.position`, CARD_POSITIONS),
    ink: readOneOf<CardInk>(card.ink, `${path}.ink`, CARD_INKS),
    ...(card.veil === undefined ? {} : { veil: readVeil(card.veil, `${path}.veil`) }),
    ...(enterAtMs === undefined ? {} : { enterAtMs }),
    ...(card.revealAtMs === undefined
      ? {}
      : {
          revealAtMs: readRevealAtMs(
            card.revealAtMs,
            `${path}.revealAtMs`,
            enterAtMs ?? 0,
            slideDurationMs,
          ),
        }),
  };
}

function readVeil(value: unknown, path: string): NonNullable<Card["veil"]> {
  const veil = readObject(value, path, ["amount", "tint"]);
  return {
    amount: readUnitInterval(veil.amount, `${path}.amount`),
    tint: readHexColor(veil.tint, `${path}.tint`),
  };
}

function readRevealAtMs(
  value: unknown,
  path: string,
  enterAtMs: number,
  slideDurationMs: number,
): number {
  const revealAtMs = readNonNegativeInteger(value, path);
  const minimum = enterAtMs + CARD_ENTER_MS;
  if (revealAtMs < minimum) {
    throw new SlideshowFormatError(
      path,
      `at least enterAtMs + CARD_ENTER_MS (${minimum})`,
      revealAtMs,
    );
  }
  const maximum = slideDurationMs - CARD_REVEAL_MS;
  if (revealAtMs > maximum) {
    throw new SlideshowFormatError(
      path,
      `at most the slide's durationMs − CARD_REVEAL_MS (${maximum})`,
      revealAtMs,
    );
  }
  return revealAtMs;
}
