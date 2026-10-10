/** The player engine's public API; the app imports nothing else from `src/player/`. */
export { type OpenPicture } from "./browser/picture-loader";
export {
  AudioElementMusic,
  animationFrames,
  createMusicAudioContext,
  performanceClock,
} from "./browser/platform";
export {
  MusicOutput,
  type CreateMusicAudioContext,
  type GainNodeLike,
  type MusicAudioContext,
  type MusicVolume,
  type VolumeElement,
} from "./browser/music-output";
export { captionLength, MAX_CAPTION_LENGTH, normalizeCaption, withinCaptionLimit } from "./caption";
export { CAPTION_GLIDE_MS } from "./caption-glide";
export { CAPTION_FONT_NAME, CAPTION_FONT_WEIGHT } from "./caption-layout";
export { captionStyles } from "./caption-style";
export { createFramePlayer, type FramePlayer } from "./create-frame-player";
export { createPlayer } from "./create-player";
export { layerTransform } from "./dom/layer-transform";
export { cropAt, cropRect, type KenBurnsAt, type Rect, type Size } from "./ken-burns";
export { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
export { SlideshowLoadError } from "./picture-buffer";
export { musicGainAt, type MusicEnvelope } from "./music-gain";
export { MusicPlaybackError, type Clock, type FrameScheduler, type MusicPlayback } from "./ports";
export { easeTransition } from "./render-frame";
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
