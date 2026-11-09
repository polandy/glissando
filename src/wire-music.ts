import { createMusicAudioContext, MusicOutput } from "./player";
import {
  browserMusicEditorAudio,
  type MusicEditorAudio,
} from "./app/music-editor/music-editor-audio";
import {
  type BackgroundMusicPasses,
  type BackgroundMusicPassesPorts,
  startBackgroundMusicPasses,
} from "./app/background-music-passes";
import {
  createFullRateDecoder,
  probeDeviceSampleRate,
} from "./music-analysis/decode-music-full-rate";
import { startAnalysisWorker, WorkerMusicAnalyser } from "./music-analysis/worker-music-analyser";

export interface MusicWiring extends BackgroundMusicPasses {
  readonly musicOutput: MusicOutput;
  readonly musicAudio: MusicEditorAudio;
}

/** Wires the shared music output and starts the background music analysis passes. */
export function wireMusic(ports: Omit<BackgroundMusicPassesPorts, "analyser">): MusicWiring {
  const musicOutput = new MusicOutput(createMusicAudioContext);
  const passes = startBackgroundMusicPasses({
    ...ports,
    analyser: new WorkerMusicAnalyser(
      createFullRateDecoder(probeDeviceSampleRate),
      startAnalysisWorker,
    ),
  });
  return { ...passes, musicOutput, musicAudio: browserMusicEditorAudio(musicOutput) };
}
