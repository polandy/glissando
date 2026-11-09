import type { CDPSession } from "playwright";
import type { BrowserCommand } from "vitest/node";

/** Chromium insists on a count between 1 and 16. */
const TOUCH_POINTS = 5;

/** The open emulation of each browser session: it ends with its DevTools session, so it is kept. */
const emulating = new Map<string, CDPSession>();

/**
 * Browser command (run by Vitest in Node) that makes the test's page a touch device: Chromium's
 * touch emulation turns `(pointer: coarse)` on, which Firefox and WebKit cannot do per test.
 */
export const setCoarsePointer: BrowserCommand<[coarse: boolean]> = async (context, coarse) => {
  if (!("page" in context))
    throw new Error("coarse pointer emulation needs the Playwright provider");
  const open = emulating.get(context.sessionId);
  if (!coarse) {
    emulating.delete(context.sessionId);
    await open?.detach();
    return;
  }
  if (open !== undefined) return;
  const session = await context.context.newCDPSession(context.page);
  emulating.set(context.sessionId, session);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: TOUCH_POINTS,
  });
  await session.send("Emulation.setEmitTouchEventsForMouse", {
    enabled: true,
    configuration: "mobile",
  });
};
