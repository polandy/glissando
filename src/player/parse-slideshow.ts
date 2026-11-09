import { GRADED_SLIDESHOW_LOOKS, type GradedSlideshowLook } from "./looks/slideshow-look";
import { readCard } from "./parse-card";
import { readKenBurns } from "./parse-ken-burns";
import { readTracks } from "./parse-music";
import { checkVideoSlide, readVideo } from "./parse-video";
import {
  readHexColor,
  readIsoDate,
  readNonEmptyString,
  readObject,
  readOneOf,
  readPositiveInteger,
  readCaptionLike,
  readString,
  SlideshowFormatError,
  type JsonObject,
} from "./parse-primitives";
import {
  SLIDESHOW_FORMAT_VERSION,
  TRANSITION_EFFECTS,
  type GroundSlide,
  type PictureSlide,
  type Slide,
  type Slideshow,
  type Transition,
  type TransitionEffect,
} from "./slideshow";

export { SlideshowFormatError };

/** Validates untrusted JSON as a slideshow; throws `SlideshowFormatError` on the first fault. */
export function parseSlideshow(input: unknown): Slideshow {
  const root = readObject(input, "", [
    "formatVersion",
    "title",
    "music",
    "slides",
    "endFadeMs",
    "look",
  ]);
  const version = root.formatVersion;
  if (version !== SLIDESHOW_FORMAT_VERSION) {
    throw new SlideshowFormatError("formatVersion", `${SLIDESHOW_FORMAT_VERSION}`, version);
  }
  const slides = readSlides(root.slides);
  const title = readString(root.title, "title");
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title,
    ...(root.look === undefined ? {} : { look: readLook(root.look, "look") }),
    ...(root.music === undefined ? {} : { music: readTracks(root.music) }),
    slides,
    ...(root.endFadeMs === undefined
      ? {}
      : {
          endFadeMs: readEndFadeMs(
            root.endFadeMs,
            "endFadeMs",
            // `readSlides` never returns an empty array, so the show always has a last slide.
            (slides.at(-1) as Slide).durationMs,
          ),
        }),
  };
}

/** "None" is never written (ADR-0044); absent already means it, so it is refused here too. */
function readLook(value: unknown, path: string): GradedSlideshowLook {
  return readOneOf<GradedSlideshowLook>(value, path, GRADED_SLIDESHOW_LOOKS);
}

function readEndFadeMs(value: unknown, path: string, lastSlideDurationMs: number): number {
  const endFadeMs = readPositiveInteger(value, path);
  if (endFadeMs > lastSlideDurationMs) {
    throw new SlideshowFormatError(
      path,
      `at most the last slide's durationMs (${lastSlideDurationMs})`,
      endFadeMs,
    );
  }
  return endFadeMs;
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SlideshowFormatError(path, "an object", value);
  }
  return "ground" in value
    ? readGroundSlide(value as JsonObject, path, isLast)
    : readPictureSlide(value as JsonObject, path, isLast);
}

/** The optional `transitionToNext`, common to both slide kinds. */
function readTransitionField(
  raw: JsonObject,
  path: string,
  isLast: boolean,
  durationMs: number,
): { transitionToNext?: Transition } {
  if (raw.transitionToNext === undefined) {
    return {};
  }
  if (isLast) {
    throw new SlideshowFormatError(
      `${path}.transitionToNext`,
      "it absent on the last slide",
      raw.transitionToNext,
    );
  }
  return {
    transitionToNext: readTransition(raw.transitionToNext, `${path}.transitionToNext`, durationMs),
  };
}

function readPictureSlide(raw: JsonObject, path: string, isLast: boolean): PictureSlide {
  const slide = readObject(raw, path, [
    "image",
    "durationMs",
    "kenBurns",
    "partner",
    "video",
    "caption",
    "fit",
    "card",
    "transitionToNext",
  ]);
  const durationMs = readPositiveInteger(slide.durationMs, `${path}.durationMs`);
  const read: PictureSlide = {
    image: readSlideImage(slide.image, `${path}.image`),
    durationMs,
    kenBurns: readKenBurns(slide.kenBurns, `${path}.kenBurns`),
    ...(slide.partner === undefined
      ? {}
      : { partner: readPartner(slide.partner, `${path}.partner`) }),
    ...(slide.video === undefined ? {} : { video: readVideo(slide.video, `${path}.video`) }),
    ...(slide.caption === undefined
      ? {}
      : { caption: readCaptionLike(slide.caption, `${path}.caption`) }),
    ...(slide.fit === undefined ? {} : { fit: readFit(slide.fit, `${path}.fit`) }),
    ...(slide.card === undefined
      ? {}
      : { card: readCard(slide.card, `${path}.card`, durationMs, true) }),
  };
  if (read.video !== undefined) {
    checkVideoSlide(read, read.video, path);
  }
  return { ...read, ...readTransitionField(slide, path, isLast, durationMs) };
}

function readGroundSlide(raw: JsonObject, path: string, isLast: boolean): GroundSlide {
  const slide = readObject(raw, path, ["ground", "durationMs", "card", "transitionToNext"]);
  const durationMs = readPositiveInteger(slide.durationMs, `${path}.durationMs`);
  if (slide.card === undefined) {
    throw new SlideshowFormatError(
      `${path}.card`,
      "a card (every ground slide carries one)",
      slide.card,
    );
  }
  const read: GroundSlide = {
    ground: readHexColor(slide.ground, `${path}.ground`),
    durationMs,
    card: readCard(slide.card, `${path}.card`, durationMs, false),
  };
  return { ...read, ...readTransitionField(slide, path, isLast, durationMs) };
}

function readSlideImage(value: unknown, path: string): PictureSlide["image"] {
  const image = readObject(value, path, ["src", "capturedAt"]);
  return {
    src: readNonEmptyString(image.src, `${path}.src`),
    capturedAt: readIsoDate(image.capturedAt, `${path}.capturedAt`),
  };
}

function readPartner(value: unknown, path: string): NonNullable<PictureSlide["partner"]> {
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
