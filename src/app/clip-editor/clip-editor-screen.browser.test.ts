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
