import { commands } from "vitest/browser";
import type { TouchPhase, TouchPoint } from "./touch-input-command";

declare module "vitest/browser" {
  interface BrowserCommands {
    /** One genuine touch event through Chromium's input pipeline; Chromium only. */
    dispatchTouch: (phase: TouchPhase, points: readonly TouchPoint[]) => Promise<void>;
    /** Ends the touch session and its emulation. */
    endTouchInput: () => Promise<void>;
  }
}

/** The test iframe's offset in the browser page, which genuine touch coordinates are given in. */
function frameOffset(): { x: number; y: number } {
  const frame = window.frameElement;
  if (frame === null) throw new Error("the test is not running in an iframe");
  const box = frame.getBoundingClientRect();
  return { x: box.left + frame.clientLeft, y: box.top + frame.clientTop };
}

/** A finger on the screen; `x` and `y` are viewport coordinates of the test's own page. */
export class RealFinger {
  static readonly ID = 1;

  async down(x: number, y: number): Promise<void> {
    await this.#send("touchStart", x, y);
  }

  async move(x: number, y: number): Promise<void> {
    await this.#send("touchMove", x, y);
  }

  async up(): Promise<void> {
    await commands.dispatchTouch("touchEnd", []);
  }

  async #send(phase: TouchPhase, x: number, y: number): Promise<void> {
    const offset = frameOffset();
    await commands.dispatchTouch(phase, [{ id: RealFinger.ID, x: x + offset.x, y: y + offset.y }]);
  }
}

export async function endTouchInput(): Promise<void> {
  await commands.endTouchInput();
}
