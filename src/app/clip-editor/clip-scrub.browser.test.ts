import { flushSync } from "svelte";
import { server } from "vitest/browser";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { StoredVideo } from "../../library/own-video";
import { generatedClip } from "../../video-export/testing/generated-clip";
import { view } from "../picture-editor/picture-editor-harness";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import ClipEditorScreen from "./ClipEditorScreen.svelte";

const CLIP_MS = 4000;
const CLIP: StoredVideo = { mediaId: "v", sourceMs: CLIP_MS, startMs: 1000, endMs: 3000 };
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
/** A software encode of a short clip can take a while on a shared runner; a ceiling, not a wait. */
const GENERATION_CEILING_MS = 60_000;
const SCRUB_AT_MS = 1500;
const SCRUBBED_CLIP_SECONDS = (CLIP.startMs + SCRUB_AT_MS) / 1000;

let clipBlob: Blob;
let destroy = () => {};
let url = "";
beforeAll(async () => {
  clipBlob = await generatedClip("#ff0000", CLIP_MS, 0.5);
}, GENERATION_CEILING_MS);
afterEach(() => {
  destroy();
  URL.revokeObjectURL(url);
});

function mountPlayable() {
  url = URL.createObjectURL(clipBlob);
  const props = reactiveProps({
    slide: view(),
    video: CLIP,
    slideshowTitle: "Sommer am See",
    posterUrl: PIXEL,
    videoUrl: url,
    saving: false,
    onBack: () => {},
    onOpen: () => {},
    onExcerpt: () => {},
    onVolume: () => {},
    onDuckMusic: () => {},
    onReset: () => {},
  });
  destroy = mountWithTranslator(ClipEditorScreen, props).destroy;
  const scrub = document.querySelector<HTMLInputElement>(
    'input[aria-label="Position im Ausschnitt"]',
  ) as HTMLInputElement;
  const clip = document.querySelector("video") as HTMLVideoElement;
  return {
    clip,
    scrubTo(ms: number) {
      scrub.value = String(ms);
      scrub.dispatchEvent(new Event("input", { bubbles: true }));
    },
  };
}

describe("scrubbing a clip in the editor", () => {
  it("moves the clip to the slider's place within the excerpt", async () => {
    const { clip, scrubTo } = mountPlayable();
    await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));

    scrubTo(SCRUB_AT_MS);

    await vi.waitFor(() => expect(clip.currentTime).toBeCloseTo(SCRUBBED_CLIP_SECONDS, 1));
  });

  // WebKit's AAC encoder stamps every packet 0, so a seek in a clip it wrote never completes.
  it.skipIf(server.browser === "webkit")(
    "leaves a paused clip where the viewer put it",
    async () => {
      const { clip, scrubTo } = mountPlayable();
      await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));
      scrubTo(SCRUB_AT_MS);
      await vi.waitFor(() => {
        expect(clip.seeking).toBe(false);
        expect(clip.currentTime).toBeCloseTo(SCRUBBED_CLIP_SECONDS, 1);
      });
      const assigned: number[] = [];
      const original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      Object.defineProperty(clip, "currentTime", {
        get: () => original?.get?.call(clip) as number,
        set: (seconds: number) => assigned.push(seconds),
      });

      clip.dispatchEvent(new Event("play"));
      flushSync();
      clip.dispatchEvent(new Event("pause"));
      flushSync();

      expect(assigned).toEqual([]);
    },
  );

  it("moves the strip's playhead and time chip to the scrubbed place in the whole clip", async () => {
    const { clip, scrubTo } = mountPlayable();
    await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));

    scrubTo(SCRUB_AT_MS);
    flushSync();

    const track = document.querySelector('[aria-label="Ausschnitt wählen"] .track') as HTMLElement;
    const trackRect = track.getBoundingClientRect();
    const expectedX = trackRect.left + ((CLIP.startMs + SCRUB_AT_MS) / CLIP_MS) * trackRect.width;

    const playheadRect = track.querySelector(".playhead")?.getBoundingClientRect();
    expect((playheadRect?.left ?? 0) + (playheadRect?.width ?? 0) / 2).toBeCloseTo(expectedX, 0);
    expect(track.querySelector(".chip")?.textContent?.trim()).toBe("0:02,5");
  });

  it("pauses a playing clip and shows the grabbed handle's frame", async () => {
    const { clip } = mountPlayable();
    await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));
    let pauseCalls = 0;
    Object.defineProperty(clip, "pause", { value: () => (pauseCalls += 1) });

    // A fake play event marks the preview as playing without needing a real autoplay gesture.
    clip.dispatchEvent(new Event("play"));
    flushSync();

    const handle = document.querySelector<HTMLElement>(
      '[role="slider"][aria-label="Anfang"]',
    ) as HTMLElement;
    const track = document.querySelector('[aria-label="Ausschnitt wählen"] .track') as HTMLElement;
    const rect = track.getBoundingClientRect();
    const at = (ms: number) => ({
      clientX: rect.left + (ms / CLIP_MS) * rect.width,
      clientY: 0,
      pointerId: 1,
      bubbles: true,
    });
    const grabbedAtMs = 1500;

    handle.dispatchEvent(new PointerEvent("pointerdown", at(CLIP.startMs)));
    window.dispatchEvent(new PointerEvent("pointermove", at(grabbedAtMs)));
    flushSync();

    expect(pauseCalls).toBeGreaterThan(0);
    await vi.waitFor(() => expect(clip.currentTime).toBeCloseTo(grabbedAtMs / 1000, 1));
  });

  // WebKit's AAC encoder stamps every packet 0, so a seek in a clip it wrote never completes;
  // the deferred peek seek this test drives right after the first one would then never settle.
  it.skipIf(server.browser === "webkit")(
    "keeps the scrub slider and the strip's mark at the clip's own place while a handle is dragged",
    async () => {
      const { clip, scrubTo } = mountPlayable();
      await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));
      scrubTo(1000); // 2000 ms in the whole clip, well inside the 1000-3000 excerpt
      await vi.waitFor(() => expect(clip.currentTime).toBeCloseTo(2, 1));

      const scrub = document.querySelector<HTMLInputElement>(
        'input[aria-label="Position im Ausschnitt"]',
      ) as HTMLInputElement;
      const handle = document.querySelector<HTMLElement>(
        '[role="slider"][aria-label="Anfang"]',
      ) as HTMLElement;
      const track = document.querySelector(
        '[aria-label="Ausschnitt wählen"] .track',
      ) as HTMLElement;
      const rect = track.getBoundingClientRect();
      const at = (ms: number) => ({
        clientX: rect.left + (ms / CLIP_MS) * rect.width,
        clientY: 0,
        pointerId: 1,
        bubbles: true,
      });
      const draggedToMs = 1200; // still short of the remembered 2000 ms, so it stays in bounds

      handle.dispatchEvent(new PointerEvent("pointerdown", at(CLIP.startMs)));
      window.dispatchEvent(new PointerEvent("pointermove", at(draggedToMs)));
      flushSync();

      await vi.waitFor(() => expect(clip.currentTime).toBeCloseTo(draggedToMs / 1000, 1));
      // The remembered 2000 ms, not the dragged 1200 ms: the chip is on the whole clip's scale.
      expect(track.querySelector(".chip")?.textContent?.trim()).toBe("0:02,0");
      // Relative to the handle's new (dragged) start of 1200 ms, the same 2000 ms is 800 ms in.
      expect(Number(scrub.value)).toBeCloseTo(800, 0);
    },
  );

  it("plays the clip again after releasing a handle it was playing when grabbed", async () => {
    const { clip } = mountPlayable();
    await vi.waitFor(() => expect(clip.readyState).toBeGreaterThan(1));
    let pauseCalls = 0;
    let playCalls = 0;
    Object.defineProperty(clip, "pause", { value: () => (pauseCalls += 1) });
    Object.defineProperty(clip, "play", {
      value: () => {
        playCalls += 1;
        return Promise.resolve();
      },
    });

    // A fake play event marks the preview as playing without needing a real autoplay gesture.
    clip.dispatchEvent(new Event("play"));
    flushSync();

    const handle = document.querySelector<HTMLElement>(
      '[role="slider"][aria-label="Anfang"]',
    ) as HTMLElement;
    const track = document.querySelector('[aria-label="Ausschnitt wählen"] .track') as HTMLElement;
    const rect = track.getBoundingClientRect();
    const at = (ms: number) => ({
      clientX: rect.left + (ms / CLIP_MS) * rect.width,
      clientY: 0,
      pointerId: 1,
      bubbles: true,
    });

    handle.dispatchEvent(new PointerEvent("pointerdown", at(CLIP.startMs)));
    window.dispatchEvent(new PointerEvent("pointermove", at(1500)));
    flushSync();
    window.dispatchEvent(new PointerEvent("pointerup", at(1500)));
    flushSync();

    expect(pauseCalls).toBeGreaterThan(0);
    expect(playCalls).toBeGreaterThan(0);
  });
});
