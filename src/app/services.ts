import type { LibraryStore } from "../library/stored-slideshow";
import type { ErrorReporter } from "./errors/error-reporter";
import type { ImportSession } from "./import/import-session";
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
  newImportSession(): ImportSession;
  /** A new random id. */
  newId(): string;
  /** The current instant. */
  now(): Date;
  /** Deletes media no slideshow uses and no claim in any tab spares; reports failures. */
  deleteAbandonedMedia(): void;
}
