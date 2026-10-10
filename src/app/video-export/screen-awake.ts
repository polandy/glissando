/** What keeping the screen on needs of the browser: `navigator.wakeLock` and page visibility. */
export interface ScreenAwakePorts {
  request(): Promise<{ release(): Promise<void> }>;
  isVisible(): boolean;
  onVisibilityChange(listener: () => void): () => void;
  /** A refused lock: the export runs on without one. */
  log(error: unknown): void;
}

/**
 * Keeps the screen on until released. The browser drops the lock whenever the page is hidden, so
 * it is asked for again each time the page becomes visible.
 */
export function keepScreenAwake(ports: ScreenAwakePorts): { release(): void } {
  const log = (error: unknown): void => ports.log(error);
  let released = false;
  let held: { release(): Promise<void> } | null = null;

  function request(): void {
    if (!ports.isVisible()) {
      return;
    }
    ports.request().then((lock) => {
      if (released) {
        lock.release().catch(log);
      } else {
        held = lock;
      }
    }, log);
  }

  const stopWatching = ports.onVisibilityChange(request);
  request();
  return {
    release() {
      released = true;
      stopWatching();
      held?.release().catch(log);
      held = null;
    },
  };
}

/** The browser's wake lock; where there is none, the screen may turn off and pause the export. */
export function browserScreenAwakePorts(
  document: Document,
  navigator: Navigator,
  log: (error: unknown) => void,
): ScreenAwakePorts {
  return {
    request: () =>
      "wakeLock" in navigator
        ? navigator.wakeLock.request("screen")
        : Promise.resolve({ release: () => Promise.resolve() }),
    isVisible: () => document.visibilityState === "visible",
    onVisibilityChange: (listener) => {
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
    log,
  };
}
