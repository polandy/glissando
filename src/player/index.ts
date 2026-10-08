/** The player engine's public API; the app imports nothing else from `src/player/`. */
export { type OpenPicture } from "./browser/picture-loader";
export { animationFrames, performanceClock } from "./browser/platform";
export { captionLength, MAX_CAPTION_LENGTH, normalizeCaption } from "./caption";
export { captionStyles } from "./caption-style";
export { createPlayer } from "./create-player";
export { layerTransform } from "./dom/layer-transform";
export { cropRect, framingAt, type Rect, type Size } from "./ken-burns";
export { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
export { SlideshowLoadError } from "./picture-buffer";
export { MusicPlaybackError, type Clock, type FrameScheduler } from "./ports";
export { PLAYER_EVENTS, type PlayerEvent } from "./player-events";
export { SlideshowPlayer } from "./slideshow-player";
export {
  EASINGS,
  MILLISECONDS_PER_SECOND,
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
