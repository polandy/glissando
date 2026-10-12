import { CAPTION_RULE, isCaption } from "./caption";
import {
  EASINGS,
  MIN_KEN_BURNS_ZOOM,
  SLIDESHOW_FORMAT_VERSION,
  TRANSITION_EFFECTS,
  type Easing,
  type Framing,
  type KenBurns,
  type MusicTrack,
  type Slide,
  type Slideshow,
  type Transition,
  type TransitionEffect,
} from "./slideshow";

/** The slideshow JSON broke the format at `path`; the message says what to set instead. */
export class SlideshowFormatError extends Error {
  constructor(
    readonly path: string,
    expected: string,
    actual: unknown,
  ) {
    super(`${path || "slideshow"}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "SlideshowFormatError";
  }
}

const ISO_8601_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

type JsonObject = Readonly<Record<string, unknown>>;

/** Validates untrusted JSON as a slideshow; throws `SlideshowFormatError` on the first fault. */
export function parseSlideshow(input: unknown): Slideshow {
  const root = readObject(input, "", ["formatVersion", "title", "music", "slides"]);
  const version = root.formatVersion;
  if (version !== SLIDESHOW_FORMAT_VERSION) {
    throw new SlideshowFormatError("formatVersion", `${SLIDESHOW_FORMAT_VERSION}`, version);
  }
  const slides = readSlides(root.slides);
  const title = readString(root.title, "title");
  return root.music === undefined
    ? { formatVersion: SLIDESHOW_FORMAT_VERSION, title, slides }
    : {
        formatVersion: SLIDESHOW_FORMAT_VERSION,
        title,
        music: readTracks(root.music),
        slides,
      };
}

const TRACK_TIMES = ["startMs", "endMs", "fadeInMs", "fadeOutMs"] as const;

function readTracks(value: unknown): readonly MusicTrack[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SlideshowFormatError("music", "an array with at least one track", value);
  }
  let previousAtMs = 0;
  return value.map((item: unknown, index) => {
    const path = `music[${index}]`;
    const fields = readObject(item, path, ["src", "atMs", ...TRACK_TIMES]);
    const atMs = readNonNegativeInteger(fields.atMs, `${path}.atMs`);
    if (atMs < previousAtMs) {
      throw new SlideshowFormatError(
        `${path}.atMs`,
        `at least the previous track's atMs (${previousAtMs})`,
        atMs,
      );
    }
    previousAtMs = atMs;
    return { ...readTrack(fields, path), atMs };
  });
}

function readTrack(track: JsonObject, path: string): Omit<MusicTrack, "atMs"> {
  const startMs = readNonNegativeInteger(track.startMs, `${path}.startMs`);
  const endMs = readNonNegativeInteger(track.endMs, `${path}.endMs`);
  if (endMs <= startMs) {
    throw new SlideshowFormatError(`${path}.endMs`, `a time after startMs (${startMs})`, endMs);
  }
  const fadeInMs = readNonNegativeInteger(track.fadeInMs, `${path}.fadeInMs`);
  const fadeOutMs = readNonNegativeInteger(track.fadeOutMs, `${path}.fadeOutMs`);
  const heardMs = endMs - startMs;
  if (fadeInMs + fadeOutMs > heardMs) {
    throw new SlideshowFormatError(
      `${path}.fadeOutMs`,
      `fadeInMs + fadeOutMs at most endMs − startMs (${heardMs})`,
      fadeOutMs,
    );
  }
  return { src: readNonEmptyString(track.src, `${path}.src`), startMs, endMs, fadeInMs, fadeOutMs };
}

function readSlides(value: unknown): readonly Slide[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SlideshowFormatError("slides", "an array with at least one slide", value);
  }
  const lastIndex = value.length - 1;
  return value.map((slide: unknown, index) =>
    readSlide(slide, `slides[${index}]`, index === lastIndex),
  );
}

const FIT_COVER = "cover";

function readSlide(value: unknown, path: string, isLast: boolean): Slide {
  const slide = readObject(value, path, [
    "image",
    "durationMs",
    "kenBurns",
    "partner",
    "caption",
    "fit",
    "transitionToNext",
  ]);
  const durationMs = readPositiveInteger(slide.durationMs, `${path}.durationMs`);
  const read: Slide = {
    image: readSlideImage(slide.image, `${path}.image`),
    durationMs,
    kenBurns: readKenBurns(slide.kenBurns, `${path}.kenBurns`),
    ...(slide.partner === undefined
      ? {}
      : { partner: readPartner(slide.partner, `${path}.partner`) }),
    ...(slide.caption === undefined
      ? {}
      : { caption: readCaption(slide.caption, `${path}.caption`) }),
    ...(slide.fit === undefined ? {} : { fit: readFit(slide.fit, `${path}.fit`) }),
  };
  if (slide.transitionToNext === undefined) {
    return read;
  }
  if (isLast) {
    throw new SlideshowFormatError(
      `${path}.transitionToNext`,
      "it absent on the last slide",
      slide.transitionToNext,
    );
  }
  return {
    ...read,
    transitionToNext: readTransition(
      slide.transitionToNext,
      `${path}.transitionToNext`,
      durationMs,
    ),
  };
}

function readSlideImage(value: unknown, path: string): Slide["image"] {
  const image = readObject(value, path, ["src", "capturedAt"]);
  return {
    src: readNonEmptyString(image.src, `${path}.src`),
    capturedAt: readIsoDate(image.capturedAt, `${path}.capturedAt`),
  };
}

function readPartner(value: unknown, path: string): NonNullable<Slide["partner"]> {
  const partner = readObject(value, path, ["image", "kenBurns"]);
  return {
    image: readSlideImage(partner.image, `${path}.image`),
    kenBurns: readKenBurns(partner.kenBurns, `${path}.kenBurns`),
  };
}

function readFit(value: unknown, path: string): "cover" {
  if (value !== FIT_COVER) {
    throw new SlideshowFormatError(path, `"${FIT_COVER}"`, value);
  }
  return value;
}

function readCaption(value: unknown, path: string): string {
  if (!isCaption(value)) {
    throw new SlideshowFormatError(path, CAPTION_RULE, value);
  }
  return value;
}

function readKenBurns(value: unknown, path: string): KenBurns {
  const kenBurns = readObject(value, path, ["from", "to", "easing"]);
  return {
    from: readFraming(kenBurns.from, `${path}.from`),
    to: readFraming(kenBurns.to, `${path}.to`),
    easing: readOneOf<Easing>(kenBurns.easing, `${path}.easing`, EASINGS),
  };
}

function readFraming(value: unknown, path: string): Framing {
  const framing = readObject(value, path, ["zoom", "centerX", "centerY"]);
  const zoom = framing.zoom;
  if (typeof zoom !== "number" || !Number.isFinite(zoom) || zoom < MIN_KEN_BURNS_ZOOM) {
    throw new SlideshowFormatError(`${path}.zoom`, `a number ≥ ${MIN_KEN_BURNS_ZOOM}`, zoom);
  }
  return {
    zoom,
    centerX: readUnitInterval(framing.centerX, `${path}.centerX`),
    centerY: readUnitInterval(framing.centerY, `${path}.centerY`),
  };
}

function readTransition(value: unknown, path: string, slideDurationMs: number): Transition {
  const transition = readObject(value, path, ["effect", "durationMs"]);
  const effect = readOneOf<TransitionEffect>(
    transition.effect,
    `${path}.effect`,
    TRANSITION_EFFECTS,
  );
  const durationMs = readPositiveInteger(transition.durationMs, `${path}.durationMs`);
  if (durationMs > slideDurationMs) {
    throw new SlideshowFormatError(
      `${path}.durationMs`,
      `at most the slide's durationMs (${slideDurationMs})`,
      durationMs,
    );
  }
  return { effect, durationMs };
}

function readObject(value: unknown, path: string, knownKeys: readonly string[]): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SlideshowFormatError(path, "an object", value);
  }
  const unknownKey = Object.keys(value).find((key) => !knownKeys.includes(key));
  if (unknownKey !== undefined) {
    const keyPath = path ? `${path}.${unknownKey}` : unknownKey;
    throw new SlideshowFormatError(
      keyPath,
      `no unknown key (allowed: ${knownKeys.join(", ")})`,
      unknownKey,
    );
  }
  return value as JsonObject;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new SlideshowFormatError(path, "a string", value);
  }
  return value;
}

function readNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") {
    throw new SlideshowFormatError(path, "a non-empty string", value);
  }
  return value;
}

function readIsoDate(value: unknown, path: string): string {
  if (typeof value !== "string" || !ISO_8601_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new SlideshowFormatError(path, "an ISO 8601 date such as 2025-07-01T10:00:00Z", value);
  }
  return value;
}

function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new SlideshowFormatError(path, "a positive integer", value);
  }
  return value;
}

function readNonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new SlideshowFormatError(path, "a whole number ≥ 0", value);
  }
  return value;
}

function readUnitInterval(value: unknown, path: string): number {
  if (typeof value !== "number" || !(value >= 0 && value <= 1)) {
    throw new SlideshowFormatError(path, "a number from 0 to 1", value);
  }
  return value;
}

function readOneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.some((option) => option === value)) {
    throw new SlideshowFormatError(path, `one of ${allowed.join(", ")}`, value);
  }
  return value as T;
}
