import type { BrowserCommand } from "vitest/node";

/** Chromium insists on a count between 1 and 16 for touch emulation. */
const TOUCH_POINTS = 5;

/** One finger on the screen, in the coordinates of the browser page (not of the test iframe). */
export interface TouchPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export type TouchPhase = "touchStart" | "touchMove" | "touchEnd" | "touchCancel";

interface CdpSession {
  send(method: string, params?: object): Promise<unknown>;
  detach(): Promise<void>;
}

/** The page's open touch session; its emulation stays on until `endTouchInput`. */
let session: CdpSession | null = null;

/**
 * Browser command (run by Vitest in Node): one genuine touch event from the browser's input
 * pipeline, as a finger on a phone sends it, so the page's native pan, `touch-action`, pointer
 * cancelling and long-press handling all take part. Chromium only.
 */
export const dispatchTouch: BrowserCommand<
  [phase: TouchPhase, points: readonly TouchPoint[]]
> = async (context, phase, points) => {
  if (!("page" in context)) throw new Error("touch input needs the Playwright provider");
  if (session === null) {
    session = (await context.context.newCDPSession(context.page)) as CdpSession;
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: TOUCH_POINTS,
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: phase,
    touchPoints: phase === "touchEnd" || phase === "touchCancel" ? [] : points,
  });
};

/** Switches the touch emulation off again and drops the session. */
export const endTouchInput: BrowserCommand<[]> = async () => {
  if (session === null) return;
  const open = session;
  session = null;
  try {
    await open.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  } finally {
    await open.detach();
  }
};
