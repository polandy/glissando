import type { FocusDetector } from "./focus-detector";
import type { PictureFocus } from "./picture-focus";

/** One side of a shared detector: the device pass (`primary`) or the server pass (`secondary`). */
export interface SerializedFocusDetectors {
  readonly primary: FocusDetector;
  readonly secondary: FocusDetector;
}

/**
 * Shares one `FocusDetector` between the device pass and the server pass without letting them
 * use it at once (ADR-0041): at most one detection or measurement runs at a time, and a primary
 * one is never held up by a secondary one already waiting its turn, so the device pass's own search
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

  function inTurn(
    queue: Array<() => void>,
    work: () => Promise<PictureFocus>,
  ): Promise<PictureFocus> {
    return new Promise<PictureFocus>((resolve, reject) => {
      const start = (): void => {
        running = true;
        work().then(
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

  function side(queue: Array<() => void>): FocusDetector {
    return {
      detect: (thumbnail, display) => inTurn(queue, () => detector.detect(thumbnail, display)),
      measure: (display, focus) => inTurn(queue, () => detector.measure(display, focus)),
    };
  }

  return { primary: side(primaryQueue), secondary: side(secondaryQueue) };
}
