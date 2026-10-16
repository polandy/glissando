import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredVideo } from "../../library/own-video";
import { view } from "../picture-editor/picture-editor-harness";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import type { ClipSoundWave } from "./clip-sound-wave";
import ClipEditorScreen from "./ClipEditorScreen.svelte";

const CLIP: StoredVideo = { mediaId: "v", sourceMs: 60_000, startMs: 20_000, endMs: 40_000 };
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const BAR_COUNT = 200;

let destroy = () => {};
afterEach(() => destroy());

function mount(wave: ClipSoundWave | null, video: StoredVideo = CLIP) {
  const props = reactiveProps({
    slide: view(),
    video,
    wave,
    slideshowTitle: "Sommer am See",
    posterUrl: PIXEL,
    videoUrl: null,
    saving: false,
    onBack: () => {},
    onOpen: () => {},
    onExcerpt: (start: number, end: number) => {
      props.video = { ...props.video, startMs: start, endMs: end };
    },
    onVolume: () => {},
    onDuckMusic: () => {},
    onReset: () => {},
  });
  destroy = mountWithTranslator(ClipEditorScreen, props).destroy;
}

const stripTrack = () =>
  document.querySelector('[aria-label="Ausschnitt wählen"] .track') as HTMLElement;
const handle = (name: "Anfang" | "Ende") =>
  document.querySelector<HTMLElement>(`[role="slider"][aria-label="${name}"]`) as HTMLElement;
const key = (target: HTMLElement, pressed: string) => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: pressed, bubbles: true }));
  flushSync();
};

/** Each drawn bar's drawn height and the clip time (of `CLIP.sourceMs`) its centre sits at. */
function bars(): { inside: boolean; heightPx: number; atMs: number }[] {
  const trackRect = stripTrack().getBoundingClientRect();
  return [...stripTrack().querySelectorAll("svg.bars rect")].map((rect) => {
    const box = rect.getBoundingClientRect();
    return {
      inside: rect.classList.contains("inside"),
      heightPx: box.height,
      atMs: ((box.left + box.width / 2 - trackRect.left) / trackRect.width) * CLIP.sourceMs,
    };
  });
}

/** Loud everywhere in the first half, unread (zero) in the second: the mid-read state. */
function peaksWithSecondHalfUnread(): Float32Array {
  const peaks = new Float32Array(BAR_COUNT);
  peaks.fill(1, 0, BAR_COUNT / 2);
  return peaks;
}

describe("ExcerptStrip, the clip's waveform", () => {
  it("draws bars inside the excerpt in the inside style, those outside not", () => {
    mount({ kind: "peaks", peaks: new Float32Array(BAR_COUNT).fill(1) });

    const drawn = bars();
    expect(drawn.length).toBeGreaterThan(0);
    expect(
      drawn.filter((bar) => bar.atMs > 25_000 && bar.atMs < 35_000).every((bar) => bar.inside),
    ).toBe(true);
    expect(drawn.some((bar) => (bar.atMs < 10_000 || bar.atMs > 50_000) && bar.inside)).toBe(false);
  });

  it("draws every bar in the outside style when the clip's sound is off", () => {
    mount({ kind: "peaks", peaks: new Float32Array(BAR_COUNT).fill(1) }, { ...CLIP, volume: 0 });

    const drawn = bars();
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.some((bar) => bar.inside)).toBe(false);
  });

  it("shows a caption and no bars when the clip has no sound track", () => {
    mount({ kind: "no sound" });

    expect(bars()).toHaveLength(0);
    expect(stripTrack().textContent).toContain("Kein Ton in diesem Clip");
  });

  it("draws the unread half flat while the rest already shows its sound", () => {
    mount({ kind: "peaks", peaks: peaksWithSecondHalfUnread() });

    const drawn = bars();
    const read = drawn.filter((bar) => bar.atMs < 25_000);
    const unread = drawn.filter((bar) => bar.atMs > 35_000);
    expect(read.length).toBeGreaterThan(0);
    expect(unread.length).toBeGreaterThan(0);
    expect(Math.min(...read.map((bar) => bar.heightPx))).toBeGreaterThan(
      Math.max(...unread.map((bar) => bar.heightPx)),
    );
  });

  it("moves the inside/outside split when the excerpt changes", () => {
    mount({ kind: "peaks", peaks: new Float32Array(BAR_COUNT).fill(1) });
    const before = bars().find((bar) => bar.atMs > 50_000 && bar.atMs < 58_000);
    expect(before?.inside).toBe(false);

    key(handle("Ende"), "End");

    const after = bars().find((bar) => bar.atMs > 50_000 && bar.atMs < 58_000);
    expect(after?.inside).toBe(true);
  });
});
