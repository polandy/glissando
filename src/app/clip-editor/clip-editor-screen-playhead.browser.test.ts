import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredVideo } from "../../library/own-video";
import { view } from "../picture-editor/picture-editor-harness";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import ClipEditorScreen from "./ClipEditorScreen.svelte";

const CLIP: StoredVideo = { mediaId: "v", sourceMs: 60_000, startMs: 10_000, endMs: 25_000 };
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let destroy = () => {};
afterEach(() => destroy());

function mount(video: StoredVideo = CLIP) {
  const calls = {
    excerpts: [] as [number, number][],
  };
  const props = reactiveProps({
    slide: view(),
    video,
    slideshowTitle: "Sommer am See",
    posterUrl: PIXEL,
    videoUrl: null,
    saving: false,
    onBack: () => {},
    onOpen: () => {},
    onExcerpt: (start: number, end: number) => {
      calls.excerpts.push([start, end]);
      props.video = { ...props.video, startMs: start, endMs: end };
    },
    onVolume: () => {},
    onDuckMusic: () => {},
    onReset: () => {},
  });
  destroy = mountWithTranslator(ClipEditorScreen, props).destroy;
  return { calls, props };
}

const handle = (name: "Anfang" | "Ende") =>
  document.querySelector<HTMLElement>(`[role="slider"][aria-label="${name}"]`) as HTMLElement;
const key = (target: HTMLElement, pressed: string, shiftKey = false) => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: pressed, shiftKey, bubbles: true }));
  flushSync();
};

const stripTrack = () =>
  document.querySelector('[aria-label="Ausschnitt wählen"] .track') as HTMLElement;
const chip = () => stripTrack().querySelector(".chip");
const scrub = () =>
  document.querySelector<HTMLInputElement>(
    'input[aria-label="Position im Ausschnitt"]',
  ) as HTMLInputElement;
/** The playhead line's centre, which is where it marks the player's place. */
const playheadX = (): number | undefined => {
  const rect = stripTrack().querySelector(".playhead")?.getBoundingClientRect();
  return rect === undefined ? undefined : rect.left + rect.width / 2;
};
/** The client x of track time `atMs` of `CLIP.sourceMs` on the excerpt strip. */
const xOfClipMs = (atMs: number) => {
  const rect = stripTrack().getBoundingClientRect();
  return rect.left + (atMs / CLIP.sourceMs) * rect.width;
};
const pointAt = (ms: number) => ({
  clientX: xOfClipMs(ms),
  clientY: 0,
  pointerId: 1,
  bubbles: true,
});
const dragHandleTo = (name: "Anfang" | "Ende", fromMs: number, toMs: number) => {
  handle(name).dispatchEvent(new PointerEvent("pointerdown", pointAt(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", pointAt(toMs)));
  flushSync();
};
const dragHandleRelease = (name: "Anfang" | "Ende", fromMs: number, toMs: number) => {
  handle(name).dispatchEvent(new PointerEvent("pointerdown", pointAt(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", pointAt(toMs)));
  flushSync();
  window.dispatchEvent(new PointerEvent("pointerup", pointAt(toMs)));
  flushSync();
};
const scrubTo = (relativeMs: number) => {
  scrub().value = String(relativeMs);
  scrub().dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
};
/** The playhead line's grab zone, which drags the clip's place when pressed. */
const playheadZone = () => stripTrack().querySelector(".playhead-zone") as HTMLElement;
const dragLineTo = (fromMs: number, toMs: number) => {
  playheadZone().dispatchEvent(new PointerEvent("pointerdown", pointAt(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", pointAt(toMs)));
  flushSync();
};

describe("ClipEditorScreen, the playhead", () => {
  it("shows the playhead and time chip at the clip's place in the strip while paused", () => {
    mount();

    expect(playheadX()).toBeCloseTo(xOfClipMs(CLIP.startMs), 0);
    expect(chip()?.textContent?.trim()).toBe("0:10,0");
  });

  it("keeps the playhead and time chip at the clip's place while a handle is dragged", () => {
    mount();

    dragHandleTo("Ende", CLIP.endMs, 30_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(CLIP.startMs), 0);
    expect(chip()?.textContent?.trim()).toBe("0:10,0");
  });

  it("clamps the clip's place to the new excerpt's edge while it is dragged past it", () => {
    mount();
    scrubTo(5_000); // 15,000 in the whole clip

    dragHandleTo("Ende", CLIP.endMs, 12_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(12_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:12,0");
  });

  it("keeps the preview on the start handle when a second move leaves it unchanged", () => {
    mount();

    // Both moves snap to the same 0.1 s quantum, which once made the start look unmoved.
    handle("Anfang").dispatchEvent(new PointerEvent("pointerdown", pointAt(CLIP.startMs)));
    window.dispatchEvent(new PointerEvent("pointermove", pointAt(12_010)));
    flushSync();
    window.dispatchEvent(new PointerEvent("pointermove", pointAt(12_040)));
    flushSync();

    expect(playheadX()).toBeCloseTo(xOfClipMs(12_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:12,0");
  });

  it("returns to the place before a drag once it is released, clamped into the new excerpt", () => {
    mount();
    scrubTo(5_000); // 15,000 in the whole clip

    dragHandleRelease("Anfang", CLIP.startMs, 12_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(15_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:15,0");
  });

  it("clamps the restored place to the new excerpt's edge when it now falls outside", () => {
    mount();
    scrubTo(5_000); // 15,000 in the whole clip

    dragHandleRelease("Ende", CLIP.endMs, 12_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(12_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:12,0");
  });

  it("keeps the clip's place when a handle moves by keyboard, instead of jumping to it", () => {
    mount();
    scrubTo(5_000); // 15,000 in the whole clip

    key(handle("Ende"), "ArrowRight");

    expect(playheadX()).toBeCloseTo(xOfClipMs(15_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:15,0");
  });
});

describe("ClipEditorScreen, dragging the playhead line", () => {
  it("moves the chip, the line and the scrub slider to the dragged place", () => {
    mount();

    dragLineTo(CLIP.startMs, 15_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(15_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:15,0");
    expect(Number(scrub().value)).toBeCloseTo(15_000 - CLIP.startMs, 0);
  });

  it("clamps a drag past the end handle to the excerpt's end", () => {
    mount();

    dragLineTo(CLIP.startMs, 50_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(CLIP.endMs), 0);
    expect(chip()?.textContent?.trim()).toBe("0:25,0");
  });

  it("clamps a drag past the start handle to the excerpt's start", () => {
    mount();
    scrubTo(5_000); // 15,000 in the whole clip, so the drag below starts inside the excerpt

    dragLineTo(15_000, 0);

    expect(playheadX()).toBeCloseTo(xOfClipMs(CLIP.startMs), 0);
    expect(chip()?.textContent?.trim()).toBe("0:10,0");
  });

  it("lets a handle win a drag where it overlaps the line", () => {
    const { calls } = mount();
    scrubTo(CLIP.endMs - CLIP.startMs); // the playhead now sits exactly on the end handle
    const rect = stripTrack().getBoundingClientRect();
    const x = xOfClipMs(CLIP.endMs);
    const target = document.elementFromPoint(x, rect.top + rect.height / 2);

    target?.dispatchEvent(new PointerEvent("pointerdown", pointAt(CLIP.endMs)));
    window.dispatchEvent(new PointerEvent("pointermove", pointAt(20_000)));
    flushSync();

    expect(handle("Ende").getAttribute("aria-valuenow")).toBe("20000");
    expect(calls.excerpts).toEqual([]); // the drag is not released yet
  });
});
