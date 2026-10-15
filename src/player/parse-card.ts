import { cardEnterMs, CARD_REVEAL_MS } from "./card-timing";
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
  CARD_ENTRANCES,
  CARD_INKS,
  CARD_POSITIONS,
  CARD_STYLES,
  type Card,
  type CardEntrance,
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
    ? [
        "title",
        "subtitle",
        "style",
        "position",
        "ink",
        "entrance",
        "veil",
        "enterAtMs",
        "revealAtMs",
      ]
    : ["title", "subtitle", "style", "position", "ink", "entrance", "enterAtMs"];
  const card = readObject(value, path, keys);
  const enterAtMs =
    card.enterAtMs === undefined
      ? undefined
      : readNonNegativeInteger(card.enterAtMs, `${path}.enterAtMs`);
  const title = readCaptionLike(card.title, `${path}.title`);
  const subtitle =
    card.subtitle === undefined ? undefined : readCaptionLike(card.subtitle, `${path}.subtitle`);
  const entrance = readOneOf<CardEntrance>(card.entrance, `${path}.entrance`, CARD_ENTRANCES);
  return {
    title,
    ...(subtitle === undefined ? {} : { subtitle }),
    style: readOneOf<CardStyle>(card.style, `${path}.style`, CARD_STYLES),
    position: readOneOf<CardPosition>(card.position, `${path}.position`, CARD_POSITIONS),
    ink: readOneOf<CardInk>(card.ink, `${path}.ink`, CARD_INKS),
    entrance,
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
            { title, entrance, ...(subtitle === undefined ? {} : { subtitle }) },
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
  card: Pick<Card, "title" | "subtitle" | "entrance">,
): number {
  const revealAtMs = readNonNegativeInteger(value, path);
  const minimum = enterAtMs + cardEnterMs(card);
  if (revealAtMs < minimum) {
    throw new SlideshowFormatError(
      path,
      `at least enterAtMs + cardEnterMs (${minimum})`,
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
