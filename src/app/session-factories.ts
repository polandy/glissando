import type { LibraryStore } from "../library/library-store";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { convertMusic } from "../import/browser/convert-music";
import { probeMusic } from "../import/music-probe";
import type { ServerLibrary } from "../server-library/server-library";
import { AddPicturesSession, serverAddingStore } from "./add-pictures/add-pictures-session";
import type { BrowserIntakePortsDependencies } from "./import/browser-intake-ports";
import { ImportSession } from "./import/import-session";
import type { PictureIntakePorts } from "./import/picture-intake";
import { deviceSongStorage, serverSongStorage } from "./music-editor/song-intake";
import type { BrowserSampleMusic } from "./sample-music/browser-sample-music";
import type { SlideshowHome } from "./routes/slideshow-storage";

export interface SessionFactoriesDependencies {
  readonly store: LibraryStore;
  /** The server library whose creating a slideshow also starts the focus pass. */
  readonly serverLibrary: ServerLibrary;
  /** The server library as the intake reads it, before the focus pass is wired in. */
  readonly serverLibraryForAdding: ServerLibrary;
  readonly intakePorts: Omit<PictureIntakePorts, "store">;
  readonly sampleMusic: BrowserSampleMusic;
  readonly newId: BrowserIntakePortsDependencies["newId"];
  readonly now: BrowserIntakePortsDependencies["now"];
  /** Uniform in [0, 1); what a new slideshow's order is shuffled from. */
  readonly random: () => number;
  readonly log: (error: unknown) => void;
}

/** Starts the sessions of the three flows that bring media in: import, add pictures and songs. */
export function createSessionFactories(deps: SessionFactoriesDependencies) {
  const { store, serverLibrary, serverLibraryForAdding, intakePorts, sampleMusic } = deps;
  const { newId, now, random, log } = deps;
  return {
    newImportSession: () =>
      new ImportSession({
        ...intakePorts,
        store,
        probeMusic,
        convertMusic,
        createOnServer: (slideshow, songsAudio) =>
          serverLibrary.createSlideshow(slideshow, songsAudio),
        random,
        ...sampleMusic,
      }),
    newAddPicturesSession: (slideshow: StoredSlideshow, home: SlideshowHome) =>
      new AddPicturesSession(slideshow, home, {
        ...intakePorts,
        store: home === "device" ? store : serverAddingStore(serverLibraryForAdding.store),
      }),
    songIntake: (home: SlideshowHome) => ({
      probeMusic,
      convertMusic,
      log,
      storage:
        home === "device"
          ? deviceSongStorage({ store, newId, now })
          : serverSongStorage(serverLibrary),
      ...sampleMusic,
    }),
  };
}
