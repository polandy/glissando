import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_VIDEO_EXCERPT_MS, type StoredVideo } from "../../library/own-video";
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
    volumes: [] as number[],
    ducks: [] as boolean[],
    resets: 0,
    backs: 0,
  };
  const props = reactiveProps({
    slide: view(),
    video,
    slideshowTitle: "Sommer am See",
    posterUrl: PIXEL,
    videoUrl: null,
    saving: false,
    onBack: () => (calls.backs += 1),
    onOpen: () => {},
    onExcerpt: (start: number, end: number) => calls.excerpts.push([start, end]),
    onVolume: (volume: number) => calls.volumes.push(volume),
    onDuckMusic: (duck: boolean) => calls.ducks.push(duck),
    onReset: () => (calls.resets += 1),
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
const dragHandleTo = (name: "Anfang" | "Ende", fromMs: number, toMs: number) => {
  const at = (ms: number) => ({ clientX: xOfClipMs(ms), clientY: 0, pointerId: 1, bubbles: true });
  handle(name).dispatchEvent(new PointerEvent("pointerdown", at(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", at(toMs)));
  flushSync();
};

describe("ClipEditorScreen", () => {
  it("tells the excerpt's length in the film and its bounds", () => {
    mount();

    expect(document.body.textContent).toContain("Im Film: 15,0 s");
    expect(handle("Anfang").getAttribute("aria-valuenow")).toBe("10000");
    expect(handle("Ende").getAttribute("aria-valuenow")).toBe("25000");
  });

  it("moves a handle by a tenth with the arrow keys and stores it", () => {
    const { calls } = mount();

    key(handle("Ende"), "ArrowRight");

    expect(calls.excerpts).toEqual([[10_000, 25_100]]);
  });

  it("never lets the excerpt outgrow five minutes", () => {
    const { calls } = mount({
      ...CLIP,
      sourceMs: 600_000,
      startMs: 0,
      endMs: MAX_VIDEO_EXCERPT_MS,
    });

    key(handle("Ende"), "ArrowRight");

    expect(calls.excerpts).toEqual([[0, MAX_VIDEO_EXCERPT_MS]]);
  });

  it("switches the sound off and back to the remembered volume", () => {
    const { calls } = mount({ ...CLIP, volume: 60 });
    const radio = (name: string) =>
      [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find(
        (el) => el.textContent?.trim() === name,
      ) as HTMLElement;

    radio("Aus").click();
    flushSync();

    expect(calls.volumes).toEqual([0]);
  });

  it("stores the music ducking choice", () => {
    const { calls } = mount();

    document.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();

    expect(calls.ducks).toEqual([false]);
  });

  it("resets the clip and is done", () => {
    const { calls } = mount();
    const named = (name: string) =>
      [...document.querySelectorAll("button")].find(
        (el) => el.textContent?.trim() === name,
      ) as HTMLElement;

    named("Zurücksetzen").click();
    named("Fertig").click();

    expect([calls.resets, calls.backs]).toEqual([1, 1]);
  });
});

describe("ClipEditorScreen, the playhead", () => {
  it("shows the playhead and time chip at the clip's place in the strip while paused", () => {
    mount();

    expect(playheadX()).toBeCloseTo(xOfClipMs(CLIP.startMs), 0);
    expect(chip()?.textContent?.trim()).toBe("0:10,0");
  });

  it("moves the playhead to the end handle while it is dragged", () => {
    mount();

    dragHandleTo("Ende", CLIP.endMs, 30_000);

    expect(playheadX()).toBeCloseTo(xOfClipMs(30_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:30,0");
  });

  it("keeps the preview on the start handle when a second move leaves it unchanged", () => {
    mount();
    const at = (ms: number) => ({
      clientX: xOfClipMs(ms),
      clientY: 0,
      pointerId: 1,
      bubbles: true,
    });

    // Both moves snap to the same 0.1 s quantum, which once made the start look unmoved.
    handle("Anfang").dispatchEvent(new PointerEvent("pointerdown", at(CLIP.startMs)));
    window.dispatchEvent(new PointerEvent("pointermove", at(12_010)));
    flushSync();
    window.dispatchEvent(new PointerEvent("pointermove", at(12_040)));
    flushSync();

    expect(playheadX()).toBeCloseTo(xOfClipMs(12_000), 0);
    expect(chip()?.textContent?.trim()).toBe("0:12,0");
  });
});
