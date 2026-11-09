import type { ImmichAvailability } from "./immich/immich-availability";
import type { ImmichClient } from "./immich/immich-client";
import type { ImmichPictureReaders } from "./import/immich-picture-source";
import type { FocusDetector } from "./library/focus-detector";
import type { IndexedDbLibraryStore } from "./library/indexeddb-store";
import type { Navigator } from "./app/navigation/navigator";
import type { Scheduler } from "./ui-kit/scheduler";
import { HttpServerLibraryClient } from "./server-library/http-server-library-client";
import { createServerLibrary, type ServerLibrary } from "./server-library/server-library";
import { createStorageServerLibraryMemory } from "./server-library/server-library-memory";
import {
  serverSlideshowSessions,
  type ServerSlideshowSessions,
} from "./app/server-library/server-slideshow-sessions";
import { startServerFocusPass } from "./app/server-focus-pass";
import type { FocusPass } from "./library/focus-pass";

export interface ServerWiringPorts {
  readonly deviceStore: IndexedDbLibraryStore;
  readonly immichClient: ImmichClient;
  readonly immichAvailability: ImmichAvailability;
  readonly immichReaders: ImmichPictureReaders;
  /** The device pass's worker, shared through `serializeFocusDetector` (ADR-0041). */
  readonly focusDetector: FocusDetector;
  readonly navigator: Navigator;
  readonly scheduler: Scheduler;
  onShareTurnedOff(): void;
  newId(): string;
  now(): Date;
  log(error: unknown): void;
  reportError(error: unknown): void;
}

export interface ServerWiring {
  /** Its `createSlideshow` and `saveOnServer` also start the server focus pass. */
  readonly serverLibrary: ServerLibrary;
  /** The library without that start, for the add flow's session. */
  readonly serverLibraryForAdding: ServerLibrary;
  readonly serverFocusPass: FocusPass;
  readonly sessions: ServerSlideshowSessions;
}

/** Wires the self-hosted server library, its share and TV sessions and its focus pass. */
export function wireServer(window: Window, ports: ServerWiringPorts): ServerWiring {
  const { immichReaders, newId, now, log, reportError } = ports;
  // Same origin: the self-hosted Glissando routes ./api/library to its library service (ADR-0018).
  const client = new HttpServerLibraryClient({
    appUrl: new URL("./", window.location.href),
    fetch: window.fetch.bind(window),
  });
  const serverLibraryForAdding = createServerLibrary({
    client,
    immichAvailability: ports.immichAvailability,
    memory: createStorageServerLibraryMemory(window.localStorage, log),
    immich: immichReaders,
    deviceStore: ports.deviceStore,
    newId,
    now,
    log,
  });
  const sessions = serverSlideshowSessions(window, {
    shareApi: client,
    slideshows: serverLibraryForAdding.store,
    scheduler: ports.scheduler,
    onTurnedOff: ports.onShareTurnedOff,
    onError: reportError,
    log,
  });
  const { serverFocusPass, serverLibrary } = startServerFocusPass({
    serverLibrary: serverLibraryForAdding,
    detector: ports.focusDetector,
    navigator: ports.navigator,
    immich: ports.immichClient,
    reportUnavailable: (kind) => immichReaders.reportUnavailable(kind),
    log,
    reportError,
  });
  return { serverLibrary, serverLibraryForAdding, serverFocusPass, sessions };
}
