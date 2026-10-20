import { PAGE_STATE_ATTRIBUTE, type PageState } from "../../html-export/page-contract";

/**
 * Helpers for browser tests that open a player page in a frame and play it: generated pictures,
 * and waiting on the page's state rather than on time.
 */

/** A generated picture: a gradient with a disc, drawn on a canvas and encoded as JPEG. */
export async function drawnJpeg(width: number, height: number, hue: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D canvas to draw a test picture");
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue} 70% 40%)`);
  gradient.addColorStop(1, `hsl(${hue + 60} 70% 70%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "white";
  context.beginPath();
  context.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, 2 * Math.PI);
  context.fill();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

/**
 * Resolves once the page's state is `wanted`; rejects as soon as it shows an error. `seen` gets
 * every state the page passed through, also those a single observer callback covers.
 */
export function stateReached(
  document: Document,
  wanted: PageState,
  seen: PageState[],
): Promise<void> {
  const root = document.documentElement;
  const note = (state: string | null) => {
    if (state !== null && seen.at(-1) !== state) seen.push(state as PageState);
  };
  return new Promise((resolve, reject) => {
    const check = () => {
      const state = root.getAttribute(PAGE_STATE_ATTRIBUTE) as PageState | null;
      note(state);
      if (state === wanted) {
        observer.disconnect();
        resolve();
      } else if (state === "error") {
        observer.disconnect();
        reject(new Error(`the page shows an error: ${document.body.textContent}`));
      }
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) note(record.oldValue);
      check();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: [PAGE_STATE_ATTRIBUTE],
      attributeOldValue: true,
    });
    check();
  });
}

/**
 * WebKit runs no animation frame in a frame outside the window's viewport, so the page's clock
 * would stand still there; the frame is scrolled back into view whenever it is no longer wholly
 * in view. Wholly, since a frame just touching the viewport's edge still counts as intersecting.
 */
export function keptInView(frame: HTMLIFrameElement): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.intersectionRatio < 1)) frame.scrollIntoView();
    },
    { threshold: 1 },
  );
  observer.observe(frame);
  return () => observer.disconnect();
}

export function loaded(frame: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve, reject) => {
    frame.addEventListener("load", () => {
      const document = frame.contentDocument;
      if (document === null) reject(new Error("the page's frame has no readable document"));
      else resolve(document);
    });
  });
}

/** Counts a window's animation frames until stopped; `report` says how many, the last when. */
function countAnimationFrames(window: Window): { report(): string; stop(): void } {
  let count = 0;
  // On the window's own clock: each window's `performance` has its own time origin.
  let lastAtMs: number | null = null;
  let handle = 0;
  const tick = (atMs: number) => {
    count += 1;
    lastAtMs = atMs;
    handle = window.requestAnimationFrame(tick);
  };
  handle = window.requestAnimationFrame(tick);
  return {
    report: () =>
      lastAtMs === null
        ? "none"
        : `${count}, the last ${Math.round(window.performance.now() - lastAtMs)} ms ago`,
    stop: () => window.cancelAnimationFrame(handle),
  };
}

/** Collects what `window` throws and nobody catches, e.g. in an animation frame callback. */
function collectUncaughtErrors(window: Window): string[] {
  const errors: string[] = [];
  const describe = (error: unknown) =>
    error instanceof Error ? (error.stack ?? String(error)) : String(error);
  window.addEventListener("error", (event) => errors.push(describe(event.error ?? event.message)));
  window.addEventListener("unhandledrejection", (event) => errors.push(describe(event.reason)));
  return errors;
}

/** Where `element` sits in its window's viewport, so a frame scrolled out of view shows. */
function placeInView(element: Element | null): string {
  if (element === null) return "none";
  const { top, bottom } = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  return `${Math.round(top)}..${Math.round(bottom)} of ${view?.innerHeight ?? "?"}`;
}

export interface PageWatch {
  /**
   * What the page in the frame shows, and whether its animation frames still run: now, or as
   * `stop` found it.
   */
  report(): Record<string, unknown>;
  /** Stops counting and keeps the report as it is now; call it before the frame is removed. */
  stop(): void;
}

/**
 * Watches the player page in `frame` from now on, so a test that times out can name where the
 * page stopped: its state and time, and whether animation frames still run in the page's window
 * and in the test's own, with both frames' places in their viewports, and what the page threw
 * uncaught. WebKit runs no animation frame in a frame it holds to be out of view, which leaves the
 * page's clock standing; an error thrown in the player's frame callback ends its frames as well.
 */
export function watchPage(frame: HTMLIFrameElement): PageWatch {
  const testFrames = countAnimationFrames(window);
  const pageFrames =
    frame.contentWindow === null ? null : countAnimationFrames(frame.contentWindow);
  const uncaughtErrors =
    frame.contentWindow === null ? [] : collectUncaughtErrors(frame.contentWindow);
  const report = () => {
    const page = frame.contentDocument;
    return {
      state: page?.documentElement.getAttribute(PAGE_STATE_ATTRIBUTE),
      time: page?.querySelector(".time")?.textContent,
      progress: page?.querySelector<HTMLElement>(".progress")?.style.width,
      fonts: page?.fonts.status,
      canvases: page?.querySelectorAll("canvas").length,
      error: page?.querySelector(".error")?.textContent,
      visibility: page?.visibilityState,
      uncaughtErrors: [...uncaughtErrors],
      pageAnimationFrames: pageFrames?.report() ?? "no window",
      testAnimationFrames: testFrames.report(),
      pageFrame: placeInView(frame),
      testFrame: placeInView(window.frameElement),
    };
  };
  let kept: Record<string, unknown> | null = null;
  return {
    report: () => kept ?? report(),
    stop() {
      if (kept !== null) return;
      kept = report();
      testFrames.stop();
      pageFrames?.stop();
    },
  };
}
