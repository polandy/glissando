import { expect } from "vitest";
import { page } from "vitest/browser";
import { FakeFrameScheduler } from "../../../player/testing/fakes";
import { FakeScheduler } from "../../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import type { PictureTile } from "../view-models";
import PictureStrip from "./PictureStrip.svelte";
import { NO_SELECTION, type StripSelection } from "./strip-selection";
import { HOLD_MS } from "./tile-drag-types";

export const PHONE = { width: 390, height: 844 };
/** The page above the strip, so the strip starts low and its later rows lie below the screen. */
const HEADER_PX = 700;
const PICTURE_COUNT = 14;
const THUMBNAIL = { width: 40, height: 30 };
const HUE_STEP = 25;
/** How far the finger rests from the screen's bottom edge: inside the auto-scroll zone. */
const EDGE_REST_PX = 16;
/** Where the finger ends: clear of the auto-scroll zone, so the page stops under it. */
const DROP_CLEARANCE_PX = 84;
const DRAG_STEPS = 4;
const MAX_FRAMES = 200;
const RIGHT_HALF = 0.75;

/** A picture-sized stand-in drawn here, so no real photo is involved. */
function thumbnail(index: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL.width;
  canvas.height = THUMBNAIL.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2d canvas");
  context.fillStyle = `hsl(${index * HUE_STEP} 60% 50%)`;
  context.fillRect(0, 0, THUMBNAIL.width, THUMBNAIL.height);
  return canvas.toDataURL();
}

function picture(index: number): PictureTile {
  return {
    id: `p${index + 1}`,
    thumbnailUrl: thumbnail(index),
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

/** A finger as a test drives it: real touch input, or synthetic pointer events. */
export interface Finger {
  down(x: number, y: number): Promise<void>;
  move(x: number, y: number): Promise<void>;
  up(): Promise<void>;
}

export interface StripRig {
  readonly target: HTMLElement;
  readonly holdScheduler: FakeScheduler;
  readonly frameScheduler: FakeFrameScheduler;
  readonly moves: [readonly string[], number][];
  readonly selections: StripSelection[];
  /** The `pointercancel` events the page saw. */
  readonly cancels: PointerEvent[];
  /** The `click` events that reached a tile. */
  readonly clicks: MouseEvent[];
  tile(number: number): HTMLElement;
  /** Settles with the next selection the strip reports; ask before the tap that causes it. */
  nextSelection(): Promise<StripSelection>;
  destroy(): void;
}

/** Mounts the strip on a phone-sized page, with faked hold and frame clocks. */
export async function mountRig(): Promise<StripRig> {
  await page.viewport(PHONE.width, PHONE.height);
  const holdScheduler = new FakeScheduler();
  const frameScheduler = new FakeFrameScheduler();
  const moves: [readonly string[], number][] = [];
  const selections: StripSelection[] = [];
  const cancels: PointerEvent[] = [];
  const clicks: MouseEvent[] = [];
  let selectionWaiters: ((next: StripSelection) => void)[] = [];
  const header = document.createElement("div");
  header.style.height = `${HEADER_PX}px`;
  document.body.style.margin = "0";
  document.body.append(header);
  const mounted = mountWithTranslator(PictureStrip, {
    pictures: Array.from({ length: PICTURE_COUNT }, (_, index) => picture(index)),
    look: "none" as const,
    newPictureIds: new Set<string>(),
    selection: NO_SELECTION,
    mousePointer: false,
    onSelectionChange: (next: StripSelection) => {
      selections.push(next);
      const waiting = selectionWaiters;
      selectionWaiters = [];
      waiting.forEach((resolve) => resolve(next));
    },
    onRemoveGroup: () => {},
    onShiftGroup: () => {},
    onMoveGroup: (ids: readonly string[], insertion: number) => moves.push([ids, insertion]),
    onOpen: () => {},
    onView: () => {},
    suppressCards: true,
    holdScheduler,
    frameScheduler,
  });
  const onCancel = (event: PointerEvent): number => cancels.push(event);
  const onClick = (event: MouseEvent): number => clicks.push(event);
  window.addEventListener("pointercancel", onCancel);
  mounted.target.addEventListener("click", onClick);
  window.scrollTo(0, 0);
  return {
    target: mounted.target,
    holdScheduler,
    frameScheduler,
    moves,
    selections,
    cancels,
    clicks,
    nextSelection: () => new Promise((resolve) => selectionWaiters.push(resolve)),
    tile: (number) => {
      const tile = mounted.target.querySelector<HTMLElement>(`[data-picture-id="p${number}"]`);
      if (tile === null) throw new Error(`no tile ${number}`);
      return tile;
    },
    destroy: () => {
      window.removeEventListener("pointercancel", onCancel);
      mounted.destroy();
      mounted.target.remove();
      header.remove();
      window.scrollTo(0, 0);
    },
  };
}

export interface DragReport {
  /** The page's scroll after the finger reached the edge, before any auto-scroll frame ran. */
  readonly scrollBeforeFrames: number;
  /** The page's scroll once tile 10 lay under the finger. */
  readonly scrollAtTarget: number;
  readonly frames: number;
}

/**
 * Holds tile 1, drags it down to the screen's bottom edge, lets the auto-scroll bring tile 10
 * under the finger, and lets go on the right half of tile 10: picture 1 goes after picture 10.
 */
export async function dragFirstToTenth(finger: Finger, rig: StripRig): Promise<DragReport> {
  const first = rig.tile(1).getBoundingClientRect();
  const startX = first.left + first.width / 2;
  const startY = first.top + first.height / 2;
  await finger.down(startX, startY);
  rig.holdScheduler.advance(HOLD_MS);
  const x = first.left + first.width * RIGHT_HALF;
  const edgeY = window.innerHeight - EDGE_REST_PX;
  for (let step = 1; step <= DRAG_STEPS; step += 1) {
    const progress = step / DRAG_STEPS;
    await finger.move(startX + (x - startX) * progress, startY + (edgeY - startY) * progress);
  }
  const scrollBeforeFrames = window.scrollY;
  const tenth = rig.tile(10);
  let frames = 0;
  const dropY = window.innerHeight - DROP_CLEARANCE_PX;
  while (!covers(tenth.getBoundingClientRect(), dropY)) {
    expect(frames, "frames until tile 10 reached the finger").toBeLessThan(MAX_FRAMES);
    rig.frameScheduler.runFrame();
    frames += 1;
  }
  const scrollAtTarget = window.scrollY;
  await finger.move(x, dropY);
  await finger.up();
  return { scrollBeforeFrames, scrollAtTarget, frames };
}

function covers(box: DOMRect, y: number): boolean {
  return box.top <= y && y <= box.bottom;
}
