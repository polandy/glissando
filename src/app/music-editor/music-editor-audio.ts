import {
  AudioElementMusic,
  animationFrames,
  performanceClock,
  type Clock,
  type FrameScheduler,
  type MusicPlayback,
} from "../../player";
import { browserObjectUrls } from "../media/object-urls";
import { decodePeaksWithWebAudio, type DecodePeaks } from "./decode-peaks";

/** The browser's audio behind seams: decoding for the waveform, playback for listening. */
export interface MusicEditorAudio {
  readonly decodePeaks: DecodePeaks;
  /** Plays the music file at `url`. */
  readonly playback: (url: string) => MusicPlayback;
  readonly createUrl: (blob: Blob) => string;
  readonly revokeUrl: (url: string) => void;
  readonly clock: Clock;
  readonly frames: FrameScheduler;
}

export const browserMusicEditorAudio: MusicEditorAudio = {
  decodePeaks: decodePeaksWithWebAudio,
  playback: (url) => new AudioElementMusic(url),
  createUrl: browserObjectUrls.create,
  revokeUrl: browserObjectUrls.revoke,
  clock: performanceClock,
  frames: animationFrames,
};
