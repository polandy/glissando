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
  /** Deletes media no slideshow and no import in progress in any tab uses; reports failures. */
  deleteAbandonedMedia(): void;
}
