import { CAPTION_RULE, isCaption } from "./caption";
import {
  EASINGS,
  FIRST_SLIDESHOW_FORMAT_VERSION,
  MIN_KEN_BURNS_ZOOM,
  SLIDESHOW_FORMAT_VERSION,
  TRANSITION_EFFECTS,
  type Easing,
  type Framing,
  type KenBurns,
  type Music,
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
  if (version !== FIRST_SLIDESHOW_FORMAT_VERSION && version !== SLIDESHOW_FORMAT_VERSION) {
    throw new SlideshowFormatError(
      "formatVersion",
      `${FIRST_SLIDESHOW_FORMAT_VERSION} or ${SLIDESHOW_FORMAT_VERSION}`,
      version,
    );
  }
  const slides = readSlides(root.slides);
  const title = readString(root.title, "title");
  return root.music === undefined
    ? { formatVersion: SLIDESHOW_FORMAT_VERSION, title, slides }
    : {
        formatVersion: SLIDESHOW_FORMAT_VERSION,
        title,
        music:
          version === FIRST_SLIDESHOW_FORMAT_VERSION
            ? readFirstVersionMusic(root.music)
            : readMusic(root.music),
        slides,
      };
}

/** Version 1 music is the whole track without fades. */
function readFirstVersionMusic(value: unknown): Music {
  const music = readObject(value, "music", ["src"]);
  return { src: readNonEmptyString(music.src, "music.src"), startMs: 0, fadeInMs: 0, fadeOutMs: 0 };
}

function readMusic(value: unknown): Music {
  const music = readObject(value, "music", ["src", "startMs", "endMs", "fadeInMs", "fadeOutMs"]);
  const startMs = readNonNegativeInteger(music.startMs, "music.startMs");
  const endMs = readNonNegativeInteger(music.endMs, "music.endMs");
  if (endMs <= startMs) {
    throw new SlideshowFormatError("music.endMs", `a time after startMs (${startMs})`, endMs);
  }
  const fadeInMs = readNonNegativeInteger(music.fadeInMs, "music.fadeInMs");
  const fadeOutMs = readNonNegativeInteger(music.fadeOutMs, "music.fadeOutMs");
  const heardMs = endMs - startMs;
  if (fadeInMs + fadeOutMs > heardMs) {
    throw new SlideshowFormatError(
      "music.fadeOutMs",
      `fadeInMs + fadeOutMs at most endMs − startMs (${heardMs})`,
      fadeOutMs,
    );
  }
  return { src: readNonEmptyString(music.src, "music.src"), startMs, endMs, fadeInMs, fadeOutMs };
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

function readSlide(value: unknown, path: string, isLast: boolean): Slide {
  const slide = readObject(value, path, [
    "image",
    "durationMs",
    "kenBurns",
    "caption",
    "transitionToNext",
  ]);
  const image = readObject(slide.image, `${path}.image`, ["src", "capturedAt"]);
  const durationMs = readPositiveInteger(slide.durationMs, `${path}.durationMs`);
  const read: Slide = {
    image: {
      src: readNonEmptyString(image.src, `${path}.image.src`),
      capturedAt: readIsoDate(image.capturedAt, `${path}.image.capturedAt`),
    },
    durationMs,
    kenBurns: readKenBurns(slide.kenBurns, `${path}.kenBurns`),
    ...(slide.caption === undefined
      ? {}
      : { caption: readCaption(slide.caption, `${path}.caption`) }),
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
