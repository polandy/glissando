/** A file the operating system handed over, as Chromium's Launch Queue gives it. */
export interface LaunchedFile {
  getFile(): Promise<File>;
}

export interface LaunchParams {
  readonly files: readonly LaunchedFile[];
}

export type LaunchConsumer = (params: LaunchParams) => void;

/** The part of the Launch Queue the app uses; it holds launches until a consumer is set. */
export interface LaunchQueue {
  setConsumer(consumer: LaunchConsumer): void;
}

export interface LaunchedFilesPorts {
  open(file: File): Promise<void>;
  reportError(error: unknown): void;
}

export interface LaunchedFiles {
  /** False where the browser has no Launch Queue: the app never gets a launched file. */
  readonly listening: boolean;
  /** Resolves once every file launched so far has been opened. */
  settled(): Promise<void>;
}

/**
 * Opens the `.glissando` files the installed app was launched with (a double-click on the
 * desktop), one after another, as if each were picked in the library (dev-docs/APP.md).
 */
export function openLaunchedFiles(
  queue: LaunchQueue | null,
  ports: LaunchedFilesPorts,
): LaunchedFiles {
  let done = Promise.resolve();
  queue?.setConsumer(({ files }) => {
    for (const launched of files) {
      done = done.then(() =>
        launched.getFile().then(
          (file) => ports.open(file),
          (error: unknown) => ports.reportError(error),
        ),
      );
    }
  });
  return { listening: queue !== null, settled: () => done };
}

/** The browser's Launch Queue, where it has one (Chromium, installed app). */
export function browserLaunchQueue(window: Window): LaunchQueue | null {
  return "launchQueue" in window ? (window.launchQueue as LaunchQueue) : null;
}
