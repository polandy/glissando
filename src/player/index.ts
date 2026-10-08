/** The player engine's public API; the app imports nothing else from `src/player/`. */
export { type OpenPicture } from "./browser/picture-loader";
export { createPlayer } from "./create-player";
export { parseSlideshow, SlideshowFormatError } from "./parse-slideshow";
export { SlideshowLoadError } from "./picture-buffer";
export { MusicPlaybackError } from "./ports";
export { PLAYER_EVENTS, SlideshowPlayer, type PlayerEvent } from "./slideshow-player";
export {
  EASINGS,
  MILLISECONDS_PER_SECOND,
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
