import type { BeatPass } from "../library/beat-pass";
import type { FocusPass } from "../library/focus-pass";
import type { ImmichAvailability } from "../immich/immich-availability";
import type { ImmichClient } from "../immich/immich-client";
import type { MusicOutput } from "../player";
import type { LibraryStore, StoredSlideshow } from "../library/stored-slideshow";
import type { PwaStatus } from "../pwa/pwa-status";
import type { ServerLibrary } from "../server-library/server-library";
import type { ErrorReporter } from "./errors/error-reporter";
import type { LaunchQueue } from "./glissando-file/launched-files";
import type { AddPicturesSession } from "./add-pictures/add-pictures-session";
import type { SlideshowHome } from "./routes/slideshow-storage";
import type { ImportSession } from "./import/import-session";
import type { MusicEditorAudio } from "./music-editor/music-editor-audio";
import type { SongIntakeDevice } from "./music-editor/song-intake";
import type { Navigator } from "./navigation/navigator";
import type { AppSettings } from "./settings/app-settings";
import type { PersistencePrompt } from "./storage/persistence-prompt";
import type { Toaster } from "./toast/toaster";
import type { HtmlExportDevice } from "./html-export/slideshow-html-export";
import type { VideoExportDevice } from "./video-export/slideshow-video-export";
import type { ShareLinkSession } from "./share-link/share-link-session";
import type { BuildInfo } from "./settings/build-info";

/** What the composition root (`main.ts`) wires into the app. */
export interface AppServices {
  readonly store: LibraryStore;
  readonly navigator: Navigator;
  readonly toaster: Toaster;
  readonly reportError: ErrorReporter;
  readonly settings: AppSettings;
  readonly persistencePrompt: PersistencePrompt;
  /** Installing, offline use and updates (dev-docs/app/INSTALLING_AND_OFFLINE.md). */
  readonly pwa: PwaStatus;
  /** Where the music sounds, in the player and the music editor; unlocked by a user gesture. */
  readonly musicOutput: MusicOutput;
  /** Decoding and playing the music in the music editor. */
  readonly musicAudio: MusicEditorAudio;
  /** Looks for the pictures' focus in the background (ADR-0012); started as the app opens. */
  readonly focusPass: FocusPass;
  /** Listens for the music's beats in the background (ADR-0021); started as the app opens. */
  readonly beatPass: BeatPass;
  /** Listens for a server slideshow's beats as it opens and keeps them on the server (ADR-0021). */
  readonly serverBeatPass: BeatPass;
  /** Immich through the self-hosted Glissando (ADR-0013); checked as the app opens. */
  readonly immich: { readonly client: ImmichClient; readonly availability: ImmichAvailability };
  /**
   * Slideshows on the Glissando server (dev-docs/SERVER_LIBRARY.md); its availability is asked
   * whenever Immich's answers.
   */
  readonly serverLibrary: ServerLibrary;
  /** Files the installed app was launched with; null where the browser has none. */
  readonly launchQueue: LaunchQueue | null;
  /** The address the app was opened at, e.g. `http://192.168.1.20:4173`. */
  readonly appAddress: string;
  /** Which build is running, shown in the settings. */
  readonly build: BuildInfo;
  newImportSession(): ImportSession;
  newAddPicturesSession(slideshow: StoredSlideshow, home: SlideshowHome): AddPicturesSession;
  /** Reads songs picked in the music editor and stores their audio where the slideshow lives. */
  songIntake(home: SlideshowHome): SongIntakeDevice;
  /** A new random id. */
  newId(): string;
  /** The current instant. */
  now(): Date;
  /** Deletes media no slideshow uses and no claim in any tab spares; reports failures. */
  deleteAbandonedMedia(): void;
  /** Logs an error the user was told about in other words, or need not be. */
  log(error: unknown): void;
  /** Free storage on the device in bytes; null where the browser cannot tell. */
  freeBytes(): Promise<number | null>;
  /** Hands a file to the browser's downloads. */
  download(file: Blob, fileName: string): void;
  /** What the video export sheet needs of the browser (dev-docs/VIDEO_EXPORT.md). */
  readonly videoExport: VideoExportDevice;
  /** What the web page export sheet needs of the browser (dev-docs/HTML_EXPORT.md). */
  readonly htmlExport: HtmlExportDevice;
  /** A server slideshow's link and its share sheet (dev-docs/share_link/IN_THE_APP.md). */
  newShareLinkSession(slideshowId: string): ShareLinkSession;
  /** Reloads the app, e.g. to get a newer version. */
  reload(): void;
}
