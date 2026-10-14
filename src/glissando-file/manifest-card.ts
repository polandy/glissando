import {
  checkCardColour,
  checkCardFade,
  checkCardMotion,
  checkCardPosition,
  checkCardStyle,
  checkCardText,
  InvalidCardError,
} from "../library/stored-card";
import type { StoredCard, StoredCardBackground } from "../library/stored-slideshow";
import type { CardSwatchId } from "../player/card-palette";
import type { CardPosition, CardStyle } from "../player/slideshow";
import { DocumentFormatError, readObject } from "./document-values";

/**
 * A title or closing card in a document (.glissando manifest, server slideshow): the same fields
 * as `StoredCard`, but its background picture named by its position among the document's
 * pictures (`pictureIndex`), since neither document gives a picture a stable id of its own
 * (ADR-0032).
 */

/** The first .glissando and server-document version that carries `openingCard`/`closingCard`. */
export const TITLE_CARDS_FROM_VERSION = 12;

export type ManifestCardBackground =
  | { readonly kind: "colour"; readonly colour: CardSwatchId }
  | { readonly kind: "picture"; readonly pictureIndex: number; readonly fade: number };

export interface ManifestCard {
  readonly title: string;
  readonly subtitle?: string;
  readonly style: CardStyle;
  readonly position: CardPosition;
  readonly background: ManifestCardBackground;
  readonly motion: boolean;
}

/** `card`'s background picture named by its index in `pictureIds`; `undefined` stays so. */
export function cardToManifest(
  card: StoredCard | undefined,
  pictureIds: readonly string[],
): ManifestCard | undefined {
  if (card === undefined) {
    return undefined;
  }
  return {
    title: card.title,
    ...(card.subtitle === undefined ? {} : { subtitle: card.subtitle }),
    style: card.style,
    position: card.position,
    background: backgroundToManifest(card.background, pictureIds),
    motion: card.motion,
  };
}

function backgroundToManifest(
  background: StoredCardBackground,
  pictureIds: readonly string[],
): ManifestCardBackground {
  if (background.kind === "colour") {
    return background;
  }
  const pictureIndex = pictureIds.indexOf(background.pictureId);
  if (pictureIndex < 0) {
    throw new Error(
      `card background names picture "${background.pictureId}", not one of this slideshow's`,
    );
  }
  return { kind: "picture", pictureIndex, fade: background.fade };
}

/** `card`'s background picture named by `pictureIds[pictureIndex]`; `undefined` stays so. */
export function cardFromManifest(
  card: ManifestCard | undefined,
  pictureIds: readonly string[],
): StoredCard | undefined {
  if (card === undefined) {
    return undefined;
  }
  return {
    title: card.title,
    ...(card.subtitle === undefined ? {} : { subtitle: card.subtitle }),
    style: card.style,
    position: card.position,
    background: backgroundFromManifest(card.background, pictureIds),
    motion: card.motion,
  };
}

function backgroundFromManifest(
  background: ManifestCardBackground,
  pictureIds: readonly string[],
): StoredCardBackground {
  if (background.kind === "colour") {
    return background;
  }
  const pictureId = pictureIds[background.pictureIndex];
  if (pictureId === undefined) {
    throw new Error(`card background's pictureIndex ${background.pictureIndex} is out of range`);
  }
  return { kind: "picture", pictureId, fade: background.fade };
}

/** `value` as a `ManifestCard` at `path`; throws `DocumentFormatError` naming the bad field. */
export function readManifestCard(value: unknown, path: string, pictureCount: number): ManifestCard {
  const card = readObject(value, path, [
    "title",
    "subtitle",
    "style",
    "position",
    "background",
    "motion",
  ]);
  const title = readCardText(card["title"], path, "title");
  const subtitle =
    card["subtitle"] === undefined ? undefined : readCardText(card["subtitle"], path, "subtitle");
  const style = readCardCheck(checkCardStyle, card["style"], path);
  const position = readCardCheck(checkCardPosition, card["position"], path);
  const motion = readCardCheck(checkCardMotion, card["motion"], path);
  const background = readCardBackground(card["background"], path, pictureCount);
  return {
    title,
    ...(subtitle === undefined ? {} : { subtitle }),
    style,
    position,
    background,
    motion,
  };
}

function readCardBackground(
  value: unknown,
  path: string,
  pictureCount: number,
): ManifestCardBackground {
  const background = readObject(value, `${path}.background`, [
    "kind",
    "colour",
    "pictureIndex",
    "fade",
  ]);
  if (background["kind"] === "colour") {
    return {
      kind: "colour",
      colour: readCardCheck(checkCardColour, background["colour"], `${path}.background`),
    };
  }
  if (background["kind"] === "picture") {
    const pictureIndex = background["pictureIndex"];
    if (
      typeof pictureIndex !== "number" ||
      !Number.isInteger(pictureIndex) ||
      pictureIndex < 0 ||
      pictureIndex >= pictureCount
    ) {
      throw new DocumentFormatError(
        `${path}.background.pictureIndex`,
        `a whole number from 0 to ${pictureCount - 1}`,
        pictureIndex,
      );
    }
    return {
      kind: "picture",
      pictureIndex,
      fade: readCardCheck(checkCardFade, background["fade"], `${path}.background`),
    };
  }
  throw new DocumentFormatError(
    `${path}.background.kind`,
    'one of "colour", "picture"',
    background["kind"],
  );
}

function readCardText(value: unknown, path: string, field: "title" | "subtitle"): string {
  try {
    return checkCardText(value, path, field);
  } catch (error) {
    if (error instanceof InvalidCardError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}

function readCardCheck<Value>(
  check: (value: unknown, where: string) => Value,
  value: unknown,
  path: string,
): Value {
  try {
    return check(value, path);
  } catch (error) {
    if (error instanceof InvalidCardError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}
