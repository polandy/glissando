import type { SkipWaitingMessage } from "../sw/messages";

/** Relative, so the app installs from any path (ADR-0005). */
export const SERVICE_WORKER_URL = "./sw.js";

export interface WorkerPort extends Pick<EventTarget, "addEventListener"> {
  readonly state: ServiceWorkerState;
  postMessage(message: unknown): void;
}

export interface RegistrationPort extends Pick<EventTarget, "addEventListener"> {
  readonly waiting: WorkerPort | null;
  readonly installing: WorkerPort | null;
}

export interface ContainerPort extends Pick<EventTarget, "addEventListener"> {
  readonly controller: object | null;
  /** Playwright's blocked service workers resolve to nothing. */
  register(url: string): Promise<RegistrationPort | undefined>;
}

export interface ServiceWorkerUpdates {
  readonly registered: Promise<void>;
  onWaiting(listener: () => void): void;
  apply(): void;
}

const SKIP_WAITING: SkipWaitingMessage = { type: "SKIP_WAITING" };
const INSTALLED: ServiceWorkerState = "installed";

/**
 * Registers the service worker and reports a new version that waits to take over. Only the tab
 * that applies the update reloads; the others run on until their next start (ADR-0005).
 */
export function registerServiceWorker({
  container,
  reload,
  onError,
}: {
  container: ContainerPort;
  reload: () => void;
  onError: (error: unknown) => void;
}): ServiceWorkerUpdates {
  const listeners: (() => void)[] = [];
  let waiting: WorkerPort | null = null;
  const tracked = new WeakSet<WorkerPort>();
  let requested = false;
  let takenOver = false;

  function reportWaiting(worker: WorkerPort): void {
    waiting = worker;
    for (const listener of listeners) {
      listener();
    }
  }

  function trackInstalling(installing: WorkerPort | null): void {
    if (installing === null || tracked.has(installing)) {
      return;
    }
    tracked.add(installing);
    installing.addEventListener("statechange", () => {
      if (installing.state === INSTALLED && container.controller !== null) {
        reportWaiting(installing);
      }
    });
  }

  container.addEventListener("controllerchange", () => {
    if (requested) {
      reload();
    } else {
      takenOver = true;
    }
  });

  const registered = container
    .register(SERVICE_WORKER_URL)
    .then((registration) => {
      if (registration === undefined) {
        throw new Error(`registering ${SERVICE_WORKER_URL} returned no registration`);
      }
      // Without a controller this is the first install: nothing runs that it would replace.
      if (registration.waiting !== null && container.controller !== null) {
        reportWaiting(registration.waiting);
      }
      // A version may have started installing before registering resolved: its updatefound
      // has passed already.
      trackInstalling(registration.installing);
      registration.addEventListener("updatefound", () => {
        trackInstalling(registration.installing);
      });
    })
    .catch(onError);

  return {
    registered,
    onWaiting(listener) {
      listeners.push(listener);
      if (waiting !== null) {
        listener();
      }
    },
    apply() {
      if (waiting === null) {
        throw new Error("no new version waits to take over");
      }
      // Another tab already let it take over; this tab only has to load it.
      if (takenOver) {
        reload();
        return;
      }
      requested = true;
      waiting.postMessage(SKIP_WAITING);
    },
  };
}
