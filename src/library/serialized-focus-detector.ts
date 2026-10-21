import type { FocusDetector } from "./focus-detector";
import type { PictureFocus } from "./picture-focus";

/** One side of a shared detector: the device pass (`primary`) or the server pass (`secondary`). */
export interface SerializedFocusDetectors {
  readonly primary: FocusDetector;
  readonly secondary: FocusDetector;
}

/**
 * Shares one `FocusDetector` between the device pass and the server pass without letting them
 * detect at once (ADR-0041): at most one detection runs at a time, and a primary detection is
 * never held up by a secondary one already waiting its turn, so the device pass's own search
 * always comes first.
 */
export function serializeFocusDetector(detector: FocusDetector): SerializedFocusDetectors {
  let running = false;
  const primaryQueue: Array<() => void> = [];
  const secondaryQueue: Array<() => void> = [];

  function runNext(): void {
    const next = primaryQueue.shift() ?? secondaryQueue.shift();
    if (next === undefined) {
      running = false;
      return;
    }
    next();
  }

  function detect(queue: Array<() => void>, thumbnail: Blob): Promise<PictureFocus> {
    return new Promise<PictureFocus>((resolve, reject) => {
      const start = (): void => {
        running = true;
        detector.detect(thumbnail).then(
          (focus) => {
            runNext();
            resolve(focus);
          },
          (error: unknown) => {
            runNext();
            reject(error);
          },
        );
      };
      if (running) {
        queue.push(start);
      } else {
        start();
      }
    });
  }

  return {
    primary: { detect: (thumbnail) => detect(primaryQueue, thumbnail) },
    secondary: { detect: (thumbnail) => detect(secondaryQueue, thumbnail) },
  };
}
