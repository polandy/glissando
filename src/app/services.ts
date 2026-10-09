import type { FocusPass } from "../library/focus-pass";
import type { MusicOutput } from "../player";
import type { LibraryStore } from "../library/stored-slideshow";
import type { PwaStatus } from "../pwa/pwa-status";
import type { ErrorReporter } from "./errors/error-reporter";
import type { LaunchQueue } from "./glissando-file/launched-files";
import type { ImportSession } from "./import/import-session";
import type { MusicEditorAudio } from "./music-editor/music-editor-audio";
import type { Navigator } from "./navigation/navigator";
import type { AppSettings } from "./settings/app-settings";
import type { PersistencePrompt } from "./storage/persistence-prompt";
import type { Toaster } from "./toast/toaster";

/** What the composition root (`main.ts`) wires into the app. */
export interface AppServices {
  readonly store: LibraryStore;
  readonly navigator: Navigator;
  readonly toaster: Toaster;
  readonly reportError: ErrorReporter;
  readonly settings: AppSettings;
  readonly persistencePrompt: PersistencePrompt;
  /** Installing, offline use and updates (dev-docs/APP.md, Installing and offline). */
  readonly pwa: PwaStatus;
  /** Where the music sounds, in the player and the music editor; unlocked by a user gesture. */
  readonly musicOutput: MusicOutput;
  /** Decoding and playing the music in the music editor. */
  readonly musicAudio: MusicEditorAudio;
  /** Looks for the pictures' focus in the background (ADR-0012); started as the app opens. */
  readonly focusPass: FocusPass;
  /** Files the installed app was launched with; null where the browser has none. */
  readonly launchQueue: LaunchQueue | null;
  /** The address the app was opened at, e.g. `http://192.168.1.20:4173`. */
  readonly appAddress: string;
  newImportSession(): ImportSession;
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
  /** Reloads the app, e.g. to get a newer version. */
  reload(): void;
}
