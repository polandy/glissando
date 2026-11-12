import { GREY_PICTURE_COLOURS } from "../library/picture-colours";
import { DEFAULT_CARD_TINT } from "../library/stored-card";
import type { CardEntrance } from "../player/slideshow";
import { DocumentFormatError, isObject, type JsonObject } from "./document-values";
import {
  COLOURS_FROM_VERSION,
  MUSIC_TRIM_FROM_VERSION,
  SONGS_FROM_VERSION,
} from "./glissando-manifest";

/** A step rewriting an older slideshow into version `to`'s shape (ADR-0054). */
interface ManifestMigration {
  readonly to: number;
  readonly migrate: (slideshow: JsonObject, path: string) => JsonObject;
}

/** How a card entered before a card had its own entrance. */
export const CARD_ENTRANCE_BEFORE_ENTRANCES: CardEntrance = "rise";

const CARD_KEYS = ["openingCard", "closingCard"] as const;

const MIGRATIONS: readonly ManifestMigration[] = [
  { to: MUSIC_TRIM_FROM_VERSION, migrate: musicInWholeMilliseconds },
  { to: SONGS_FROM_VERSION, migrate: musicAsPlaylist },
  { to: COLOURS_FROM_VERSION, migrate: withPictureColoursAndCardLooks },
];

/** `slideshow`, read from a file of format `version`, in the shape of the current version. */
export function migrateSlideshow(slideshow: unknown, version: number, path: string): unknown {
  if (!isObject(slideshow)) {
    return slideshow;
  }
  return MIGRATIONS.filter((step) => version < step.to).reduce(
    (show, step) => step.migrate(show, path),
    slideshow,
  );
}

function musicInWholeMilliseconds(slideshow: JsonObject): JsonObject {
  const { music } = slideshow;
  if (!isObject(music) || typeof music["durationMs"] !== "number") {
    return slideshow;
  }
  return { ...slideshow, music: { ...music, durationMs: Math.ceil(music["durationMs"]) } };
}

function musicAsPlaylist(slideshow: JsonObject, path: string): JsonObject {
  refuseKeyBefore(slideshow, "songs", path, SONGS_FROM_VERSION);
  const { music, ...rest } = slideshow;
  return { ...rest, songs: music === undefined ? [] : [music] };
}

function withPictureColoursAndCardLooks(slideshow: JsonObject, path: string): JsonObject {
  const { pictures } = slideshow;
  const migrated: Record<string, unknown> = {
    ...slideshow,
    pictures: Array.isArray(pictures)
      ? pictures.map((picture: unknown, index) =>
          withGreyColours(picture, `${path}.pictures[${index}]`),
        )
      : pictures,
  };
  for (const key of CARD_KEYS) {
    if (slideshow[key] !== undefined) {
      migrated[key] = withEntranceAndTint(slideshow[key], `${path}.${key}`);
    }
  }
  return migrated;
}

function withGreyColours(picture: unknown, path: string): unknown {
  if (!isObject(picture)) {
    return picture;
  }
  refuseKeyBefore(picture, "colours", path, COLOURS_FROM_VERSION);
  return { ...picture, colours: GREY_PICTURE_COLOURS };
}

function withEntranceAndTint(card: unknown, path: string): unknown {
  if (!isObject(card)) {
    return card;
  }
  refuseKeyBefore(card, "entrance", path, COLOURS_FROM_VERSION);
  const { background } = card;
  if (!isObject(background) || background["kind"] !== "picture") {
    return { ...card, entrance: CARD_ENTRANCE_BEFORE_ENTRANCES };
  }
  refuseKeyBefore(background, "tint", `${path}.background`, COLOURS_FROM_VERSION);
  return {
    ...card,
    entrance: CARD_ENTRANCE_BEFORE_ENTRANCES,
    background: { ...background, tint: DEFAULT_CARD_TINT },
  };
}

/** Refuses `key` in an object from a version before `fromVersion`, the first to carry it. */
function refuseKeyBefore(value: JsonObject, key: string, path: string, fromVersion: number): void {
  if (value[key] !== undefined) {
    throw new DocumentFormatError(
      `${path}.${key}`,
      `no ${key} before format version ${fromVersion}`,
      value[key],
    );
  }
}
