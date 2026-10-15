import {
  readNonEmptyString,
  readNonNegativeInteger,
  readObject,
  readUnitInterval,
  SlideshowFormatError,
} from "./parse-primitives";
import {
  MAX_VIDEO_EXCERPT_MS,
  MIN_KEN_BURNS_ZOOM,
  MIN_VIDEO_EXCERPT_MS,
  type Framing,
  type PictureSlide,
  type SlideVideo,
} from "./slideshow";

export function readVideo(value: unknown, path: string): SlideVideo {
  const video = readObject(value, path, ["src", "startMs", "endMs", "volume", "duckMusic"]);
  const startMs = readNonNegativeInteger(video.startMs, `${path}.startMs`);
  const endMs = readNonNegativeInteger(video.endMs, `${path}.endMs`);
  const excerptMs = endMs - startMs;
  if (excerptMs < MIN_VIDEO_EXCERPT_MS || excerptMs > MAX_VIDEO_EXCERPT_MS) {
    throw new SlideshowFormatError(
      `${path}.endMs`,
      `a time ${MIN_VIDEO_EXCERPT_MS} to ${MAX_VIDEO_EXCERPT_MS} ms after startMs (${startMs})`,
      endMs,
    );
  }
  if (video.duckMusic !== undefined && typeof video.duckMusic !== "boolean") {
    throw new SlideshowFormatError(`${path}.duckMusic`, "true or false", video.duckMusic);
  }
  return {
    src: readNonEmptyString(video.src, `${path}.src`),
    startMs,
    endMs,
    volume: readUnitInterval(video.volume, `${path}.volume`),
    ...(video.duckMusic === undefined ? {} : { duckMusic: video.duckMusic }),
  };
}

/** A video slide's length is its excerpt, and it holds still: the clip is the motion. */
export function checkVideoSlide(slide: PictureSlide, video: SlideVideo, path: string): void {
  const excerptMs = video.endMs - video.startMs;
  if (slide.durationMs !== excerptMs) {
    throw new SlideshowFormatError(
      `${path}.durationMs`,
      `the video's endMs − startMs (${excerptMs})`,
      slide.durationMs,
    );
  }
  const { from, to } = slide.kenBurns;
  if (from.zoom !== MIN_KEN_BURNS_ZOOM || !isSameFraming(from, to)) {
    throw new SlideshowFormatError(
      `${path}.kenBurns`,
      `a still framing (from equal to, zoom ${MIN_KEN_BURNS_ZOOM}) on a video slide`,
      slide.kenBurns,
    );
  }
  if (slide.partner !== undefined) {
    throw new SlideshowFormatError(`${path}.partner`, "no partner on a video slide", slide.partner);
  }
}

function isSameFraming(a: Framing, b: Framing): boolean {
  return a.zoom === b.zoom && a.centerX === b.centerX && a.centerY === b.centerY;
}
