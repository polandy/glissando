import type { ImmichAvailabilityState } from "../immich/immich-availability";
import type { ServerLibraryState } from "../server-library/server-library-availability";
import type { PwaState } from "../pwa/status-bar-view";
import type { AddedPictures } from "./add-pictures/add-pictures-flow";
import type { AddPicturesSession } from "./add-pictures/add-pictures-session";
import type { createAppFlows } from "./app-flows";
import type { ExportProgress } from "./glissando-file/export-job";
import { openLaunchedFiles } from "./glissando-file/launched-files";
import type { OpenFlowState } from "./glissando-file/open-flow";
import type { ImportSession } from "./import/import-session";
import type { Route } from "./navigation/route";
import type { AppServices } from "./services";
import type { SettingsState } from "./settings/app-settings";
import type { ToastMessage } from "./toast/toaster";

/** The long-running flows this wiring reacts to, as `createAppFlows` returns them. */
type AppFlows = Pick<
  ReturnType<typeof createAppFlows>,
  "importFlow" | "addFlow" | "exportJob" | "openFlow"
>;

export interface AppStateSetters {
  setRoute(route: Route): void;
  /** The logo animates on the first launch only; any other route stops it for good. */
  stopLogoPlaying(): void;
  setToast(toast: ToastMessage | null): void;
  setSettingsState(state: SettingsState): void;
  setExportProgress(progress: ExportProgress | null): void;
  setOpenState(state: OpenFlowState): void;
  setImportSession(session: ImportSession | null, persistRefused: boolean): void;
  setAddState(session: AddPicturesSession | null, added: AddedPictures | null): void;
  setPwaState(state: PwaState): void;
  setImmichState(state: ImmichAvailabilityState): void;
  setServerState(state: ServerLibraryState): void;
}

/**
 * Subscribes every long-running flow and service to the app's state, and reacts to a route
 * change: ensuring the import session, following the add flow, checking Immich, and clearing a
 * stale open notice. Returns the cleanup for `onMount`.
 */
export function subscribeAppState(
  services: AppServices,
  flows: AppFlows,
  setters: AppStateSetters,
  getCurrentRoute: () => Route,
): () => void {
  const { navigator, toaster, settings, immich, pwa, launchQueue, reportError } = services;
  const { importFlow, addFlow, exportJob, openFlow } = flows;

  const stopRoute = navigator.subscribe((next) => {
    if (next.screen !== "start" && next.screen !== "settings") {
      setters.stopLogoPlaying();
    }
    if (next.screen === "import" || (next.screen === "immich" && next.slideshowId === null)) {
      importFlow.ensureSession();
    }
    addFlow.follow(next);
    if ((next.screen === "import" && next.step === "pictures") || next.screen === "add") {
      immich.availability.check().catch(reportError);
    }
    // A refused file's notice belongs to the screen it was opened from.
    if (next.screen !== getCurrentRoute().screen) {
      openFlow.dismissNotice();
    }
    setters.setRoute(next);
  });
  const stopToast = toaster.subscribe(setters.setToast);
  const stopSettings = settings.subscribe(setters.setSettingsState);
  const stopExport = exportJob.subscribe(setters.setExportProgress);
  const stopOpen = openFlow.subscribe(setters.setOpenState);
  const stopAdd = addFlow.subscribe((next) => setters.setAddState(next.session, next.added));
  const stopImport = importFlow.subscribe((next) => {
    setters.setImportSession(next.session, next.persistRefused);
    if (next.persistRefused) {
      pwa.storageRefusalTold();
    }
  });
  const stopPwa = pwa.subscribe(setters.setPwaState);
  const stopImmich = immich.availability.subscribe(setters.setImmichState);
  const stopServer = services.serverLibrary.availability.subscribe(setters.setServerState);
  // A double-clicked file starts a new window (`launch_handler`), so it opens from the library.
  openLaunchedFiles(launchQueue, {
    open: (file) => openFlow.open(file, "library"),
    reportError,
  });
  return () => {
    stopRoute();
    stopToast();
    stopSettings();
    stopImport();
    stopAdd();
    stopExport();
    stopOpen();
    stopPwa();
    stopImmich();
    stopServer();
  };
}
