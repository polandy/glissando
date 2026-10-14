import { CAPTION_RULE, isCaption } from "../player/caption";
import { CARD_SWATCHES, type CardSwatchId } from "../player/card-palette";
import {
  CARD_ENTRANCES,
  CARD_POSITIONS,
  CARD_STYLES,
  type CardEntrance,
  type CardPosition,
  type CardStyle,
} from "../player/slideshow";
import { titleForCaptureRange } from "../compose/title-for-capture-range";
import { isHexColour } from "./picture-colours";
import type {
  CardColour,
  CardTint,
  StoredCard,
  StoredCardBackground,
  StoredSlideshow,
} from "./stored-slideshow";

/**
 * A title or closing card's own rules (ADR-0032, TITLE_SLIDES.md): the caption rule for its
 * text, the fade in steps of 5, a style and a position from the fixed lists, and a background
 * whose picture must be one of the slideshow's. The composer turns it into a player card
 * (`src/compose/compose-cards.ts`).
 */

export const MIN_CARD_FADE = 0;
export const MAX_CARD_FADE = 100;
export const CARD_FADE_STEP = 5;
/** The fade a new card starts with (TITLE_SLIDES.md, "In the editor"). */
export const DEFAULT_CARD_FADE = 60;
export const CARD_TINTS: readonly CardTint[] = ["picture", "light", "dark"];
/** The tint a new picture background starts with. */
export const DEFAULT_CARD_TINT: CardTint = "picture";

/** The swatch a card's background falls back to once its picture is gone (TITLE_SLIDES.md). */
export const FALLBACK_CARD_SWATCH: CardSwatchId = "plum";

export class InvalidCardError extends Error {
  constructor(
    where: string,
    readonly field: string,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(`${where} ${field}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "InvalidCardError";
  }
}

/** `value` as a card's title or subtitle; throws `InvalidCardError` naming `where` and `field`. */
export function checkCardText(value: unknown, where: string, field: "title" | "subtitle"): string {
  if (typeof value === "string" && (value === "" || isCaption(value))) {
    return value;
  }
  throw new InvalidCardError(where, field, `an empty string or ${CAPTION_RULE}`, value);
}

/** `value` as a card's style; throws `InvalidCardError` naming `where`. */
export function checkCardStyle(value: unknown, where: string): CardStyle {
  const style = CARD_STYLES.find((candidate) => candidate === value);
  if (style === undefined) {
    throw new InvalidCardError(where, "style", `one of ${CARD_STYLES.join(", ")}`, value);
  }
  return style;
}

/** `value` as a card's position; throws `InvalidCardError` naming `where`. */
export function checkCardPosition(value: unknown, where: string): CardPosition {
  const position = CARD_POSITIONS.find((candidate) => candidate === value);
  if (position === undefined) {
    throw new InvalidCardError(where, "position", `one of ${CARD_POSITIONS.join(", ")}`, value);
  }
  return position;
}

/** `value` as a card's entrance; throws `InvalidCardError` naming `where`. */
export function checkCardEntrance(value: unknown, where: string): CardEntrance {
  const entrance = CARD_ENTRANCES.find((candidate) => candidate === value);
  if (entrance === undefined) {
    throw new InvalidCardError(where, "entrance", `one of ${CARD_ENTRANCES.join(", ")}`, value);
  }
  return entrance;
}

/** `value` as a card's veil fade; throws `InvalidCardError` naming `where`. */
export function checkCardFade(value: unknown, where: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_CARD_FADE ||
    value > MAX_CARD_FADE ||
    value % CARD_FADE_STEP !== 0
  ) {
    throw new InvalidCardError(
      where,
      "fade",
      `a whole number from ${MIN_CARD_FADE} to ${MAX_CARD_FADE} in steps of ${CARD_FADE_STEP}`,
      value,
    );
  }
  return value;
}

/** `value` as a card's colour, a swatch id or a `#RRGGBB`; throws `InvalidCardError`. */
export function checkCardColour(value: unknown, where: string): CardColour {
  if (typeof value === "string" && value in CARD_SWATCHES) {
    return value as CardSwatchId;
  }
  if (isHexColour(value)) {
    return value;
  }
  throw new InvalidCardError(
    where,
    "colour",
    `one of ${Object.keys(CARD_SWATCHES).join(", ")} or a #RRGGBB colour`,
    value,
  );
}

/** `value` as a picture background's tint; throws `InvalidCardError` naming `where`. */
export function checkCardTint(value: unknown, where: string): CardTint {
  const tint = CARD_TINTS.find((candidate) => candidate === value);
  if (tint === undefined) {
    throw new InvalidCardError(where, "tint", `one of ${CARD_TINTS.join(", ")}`, value);
  }
  return tint;
}

/** `value` as a card's motion flag; throws `InvalidCardError` naming `where`. */
export function checkCardMotion(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") {
    throw new InvalidCardError(where, "motion", "true or false", value);
  }
  return value;
}

/** What `checkStoredCard` accepts: the same shape as `StoredCard`, but every field unchecked. */
export interface CardInput {
  readonly title: unknown;
  readonly subtitle?: unknown;
  readonly style: unknown;
  readonly position: unknown;
  readonly entrance: unknown;
  readonly background: {
    readonly kind: unknown;
    readonly colour?: unknown;
    readonly pictureId?: unknown;
    readonly fade?: unknown;
    readonly tint?: unknown;
  };
  readonly motion: unknown;
}

/** `input` as a `StoredCard`; throws `InvalidCardError` naming `where` and the bad field. */
export function checkStoredCard(
  input: CardInput,
  pictureIds: ReadonlySet<string>,
  where: string,
): StoredCard {
  const title = checkCardText(input.title, where, "title");
  const subtitle =
    input.subtitle === undefined ? undefined : checkCardText(input.subtitle, where, "subtitle");
  const style = checkCardStyle(input.style, where);
  const position = checkCardPosition(input.position, where);
  const entrance = checkCardEntrance(input.entrance, where);
  const motion = checkCardMotion(input.motion, where);
  const background = checkCardBackground(input.background, pictureIds, where);
  return {
    title,
    ...(subtitle === undefined ? {} : { subtitle }),
    style,
    position,
    entrance,
    background,
    motion,
  };
}

function checkCardBackground(
  background: CardInput["background"],
  pictureIds: ReadonlySet<string>,
  where: string,
): StoredCardBackground {
  if (background.kind === "colour") {
    return { kind: "colour", colour: checkCardColour(background.colour, where) };
  }
  if (background.kind === "picture") {
    const pictureId = background.pictureId;
    if (typeof pictureId !== "string" || !pictureIds.has(pictureId)) {
      throw new InvalidCardError(
        where,
        "background.pictureId",
        "a picture in this slideshow",
        pictureId,
      );
    }
    return {
      kind: "picture",
      pictureId,
      fade: checkCardFade(background.fade, where),
      tint: checkCardTint(background.tint, where),
    };
  }
  throw new InvalidCardError(
    where,
    "background.kind",
    'one of "colour", "picture"',
    background.kind,
  );
}

/**
 * The title slide a sheet opens with for a slideshow that has none: the slideshow's title, the
 * capture range as the start card shows it, reveal on, over the first picture.
 */
export function defaultOpeningCard(slideshow: StoredSlideshow, locale: string): StoredCard {
  const firstPicture = slideshow.pictures[0];
  if (firstPicture === undefined) {
    throw new RangeError(`slideshow "${slideshow.id}" has no pictures`);
  }
  const subtitle = titleForCaptureRange(
    slideshow.pictures.map((picture) => picture.capturedAt),
    locale,
  );
  return {
    title: slideshow.title,
    subtitle,
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: {
      kind: "picture",
      pictureId: firstPicture.id,
      fade: DEFAULT_CARD_FADE,
      tint: DEFAULT_CARD_TINT,
    },
    motion: true,
  };
}

/**
 * The closing slide a sheet opens with for a slideshow that has none: an empty title, fade in on,
 * over the last picture.
 */
export function defaultClosingCard(slideshow: StoredSlideshow): StoredCard {
  const lastPicture = slideshow.pictures.at(-1);
  if (lastPicture === undefined) {
    throw new RangeError(`slideshow "${slideshow.id}" has no pictures`);
  }
  return {
    title: "",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: {
      kind: "picture",
      pictureId: lastPicture.id,
      fade: DEFAULT_CARD_FADE,
      tint: DEFAULT_CARD_TINT,
    },
    motion: true,
  };
}

/**
 * `card` once every picture in `removedPictureIds` leaves the slideshow: unchanged unless one of
 * them is its background's picture, in which case it moves to `fallbackPictureId` (the first
 * remaining picture for the opening card, the last for the closing card) or to the fallback
 * swatch when no picture is left.
 */
export function cardWithoutPicture(
  card: StoredCard | undefined,
  removedPictureIds: ReadonlySet<string>,
  fallbackPictureId: string | undefined,
): StoredCard | undefined {
  if (card === undefined || card.background.kind !== "picture") {
    return card;
  }
  if (!removedPictureIds.has(card.background.pictureId)) {
    return card;
  }
  const background: StoredCardBackground =
    fallbackPictureId === undefined
      ? { kind: "colour", colour: FALLBACK_CARD_SWATCH }
      : {
          kind: "picture",
          pictureId: fallbackPictureId,
          fade: card.background.fade,
          tint: card.background.tint,
        };
  return { ...card, background };
}
