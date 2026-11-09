import {
  AudioElementMusic,
  DeferredMusic,
  animationFrames,
  performanceClock,
  type Clock,
  type FrameScheduler,
  type MusicOutput,
  type MusicPlayback,
} from "../../player";
import { browserObjectUrls } from "../media/object-urls";

/** The browser's audio behind seams: playback for listening. */
export interface MusicEditorAudio {
  /** Plays the music file at `url`, opening it only at the first play. */
  readonly playback: (url: string) => MusicPlayback;
  readonly createUrl: (blob: Blob) => string;
  readonly revokeUrl: (url: string) => void;
  readonly clock: Clock;
  readonly frames: FrameScheduler;
}

/** The browser's audio, listening through `output`. */
export function browserMusicEditorAudio(output: MusicOutput): MusicEditorAudio {
  return {
    playback: (url) => new DeferredMusic(() => new AudioElementMusic(url, output)),
    createUrl: browserObjectUrls.create,
    revokeUrl: browserObjectUrls.revoke,
    clock: performanceClock,
    frames: animationFrames,
  };
}
