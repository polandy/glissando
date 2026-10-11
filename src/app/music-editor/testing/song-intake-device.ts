import type { LibraryStore } from "../../../library/stored-slideshow";
import { deviceSongStorage, type SongIntakeDevice } from "../song-intake";

/** Every picked song this long. */
export const PICKED_SONG_MS = 90_000;

/**
 * A song intake storing into `store` under `song-1`, `song-2`, …: every file reads as a song
 * `PICKED_SONG_MS` long, none needs converting; what goes wrong lands in `log`.
 */
export function songIntakeStoringIn(
  store: Pick<LibraryStore, "claimMedia" | "releaseClaim" | "putMusic">,
  log: (error: unknown) => void,
): SongIntakeDevice {
  let ids = 0;
  return {
    probeMusic: () => Promise.resolve({ durationMs: PICKED_SONG_MS }),
    convertMusic: (file) => Promise.reject(new Error(`no conversion expected of ${file.name}`)),
    log,
    storage: deviceSongStorage({
      store,
      newId: () => `song-${(ids += 1)}`,
      now: () => new Date("2026-10-11T12:00:00Z"),
    }),
  };
}
