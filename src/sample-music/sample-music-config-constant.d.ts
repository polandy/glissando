import type { SampleMusicConfig } from "./sample-music-config";

declare global {
  /** Put in by build/sample-music-config.ts; only the composition root (main.ts) reads it. */
  const __GLISSANDO_SAMPLE_MUSIC__: SampleMusicConfig;
}
