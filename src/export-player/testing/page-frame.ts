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
