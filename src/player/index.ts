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
export { VIDEO_POOL_SIZE, VideoElementPool } from "./browser/video-element-pool";
export { captionLength, MAX_CAPTION_LENGTH, normalizeCaption, withinCaptionLimit } from "./caption";
export { CAPTION_GLIDE_MS } from "./caption-glide";
export { CAPTION_FONT_NAME, CAPTION_FONT_WEIGHT } from "./caption-layout";
export { captionStyles } from "./caption-style";
export {
  CARD_FONT_FILES,
  cardFontFaceRule,
  cardFontFilesUsedBy,
  cardStylesUsedBy,
  type CardFontFile,
} from "./card-fonts";
export { createFramePlayer, type FramePlayer } from "./create-frame-player";
export { createPlayer } from "./create-player";
export { VIDEO_RATE_TOLERANCE_MS, VIDEO_SEEK_DRIFT_MS } from "./browser/video-playback";
export { layerTransform } from "./dom/layer-transform";
export { cropAt, cropRect, type KenBurnsAt, type Rect, type Size } from "./ken-burns";
export { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
export { SlideshowLoadError } from "./picture-buffer";
export {
  musicGainAt,
  trackGainAt,
  type MusicEnvelope,
  type PlacedMusicEnvelope,
} from "./music-gain";
export {
  MusicPlaybackError,
  VideoPlaybackError,
  type Clock,
  type FrameScheduler,
  type LiveFrame,
  type MusicPlayback,
  type VideoFrameSource,
  type VideoPlayback,
} from "./ports";
export { easeTransition } from "./render-frame";
export { PLAYER_EVENTS, type PlayerEvent } from "./player-events";
export { SlideshowPlayer } from "./slideshow-player";
export {
  EASINGS,
  isGroundSlide,
  MAX_VIDEO_EXCERPT_MS,
  MILLISECONDS_PER_SECOND,
  MIN_KEN_BURNS_ZOOM,
  MIN_VIDEO_EXCERPT_MS,
  SLIDESHOW_FORMAT_VERSION,
  TRANSITION_EFFECTS,
  type Card,
  type Easing,
  type Framing,
  type GroundSlide,
  type KenBurns,
  type MusicTrack,
  type PictureSlide,
  type Slide,
  type Slideshow,
  type SlideVideo,
  type Transition,
  type TransitionEffect,
} from "./slideshow";
export {
  duckFactorAt,
  VIDEO_DUCK_RAMP_DOWN_MS,
  VIDEO_DUCK_RAMP_UP_MS,
  VIDEO_DUCK_VOLUME,
  videoSoundSpans,
  type VideoSoundSpan,
} from "./video-duck";
