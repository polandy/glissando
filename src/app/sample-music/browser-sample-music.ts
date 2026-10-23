import { browserNetworkStatus } from "../../immich/immich-availability";
import type { LibraryStore } from "../../library/library-store";
import type { SampleMusicConfig } from "../../sample-music/sample-music-config";
import { browserObjectUrls } from "../media/object-urls";
import { SamplePreview } from "./sample-preview";
import type { SampleSongPickPorts } from "./sample-song-pick";

export interface BrowserSampleMusicDependencies {
  readonly store: Pick<LibraryStore, "hasMusic" | "musicBlob">;
  /** `window`, kept as a dependency so a test need not reach for the real one. */
  readonly target: Window & { readonly navigator: { readonly onLine: boolean } };
  readonly onError: (error: unknown) => void;
}

/**
 * What main.ts spreads into `ImportSession`'s and `SongIntake`'s ports, and into `AppServices`:
 * both keys are left out together where the build turns sample music off (SAMPLE_MUSIC.md), so a
 * spread of this at every one of those three places needs no further check.
 */
export interface BrowserSampleMusic {
  readonly sampleMusic?: SampleSongPickPorts;
  readonly samplePreview?: SamplePreview;
}

/**
 * Wires a real download, the device's library store and the network status into the sample-music
 * ports and preview controller every other module takes; `main.ts` is the only reader of
 * `__GLISSANDO_SAMPLE_MUSIC__` and passes it in here as `config`.
 */
export function browserSampleMusic(
  config: SampleMusicConfig,
  deps: BrowserSampleMusicDependencies,
): BrowserSampleMusic {
  if (!config.enabled) return {};
  const { store, target, onError } = deps;
  const hasMusic = (id: string): Promise<boolean> => store.hasMusic(id);
  const musicBlob = (id: string): Promise<Blob> => store.musicBlob(id);
  const fetchSample = (
    url: string,
    init: { readonly signal?: AbortSignal | undefined },
  ): Promise<Response> =>
    target.fetch(url, init.signal === undefined ? {} : { signal: init.signal });
  return {
    sampleMusic: { baseUrl: config.baseUrl, fetch: fetchSample, hasMusic, musicBlob },
    samplePreview: new SamplePreview({
      baseUrl: config.baseUrl,
      hasMusic,
      musicBlob,
      network: browserNetworkStatus(target),
      createAudioElement: () => new Audio(),
      onError,
      ...browserObjectUrls,
    }),
  };
}
