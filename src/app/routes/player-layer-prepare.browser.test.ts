import { flushSync } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput, VideoElementPool } from "../../player";
import type { PlaybackQuality } from "../settings/playback-quality";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
import PlayerLayer from "./PlayerLayer.svelte";

const IDS = ["p1", "p2", "p3"];
const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: IDS.map((id) => ({
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  })),
  secondsPerPicture: 5,
  songs: [],
};
/** Longer than a slide, so 4K prepares before playing. */
const ORIGINAL_MILLISECONDS = 10_000;

/**
 * A server store whose originals each take `ORIGINAL_MILLISECONDS` on the test's clock; the last
 * one never arrives until cancelled, or fails with `failure`. The previews arrive at once.
 */
class SlowOriginalsStore extends MemoryLibraryStore {
  now = 0;
  readonly signals = new Map<string, AbortSignal | undefined>();
  readonly previews: string[] = [];
  failure: Error | null = null;

  override pictureBlob(id: string, signal?: AbortSignal): Promise<Blob> {
    this.signals.set(id, signal);
    if (this.failure !== null) return Promise.reject(this.failure);
    this.now += ORIGINAL_MILLISECONDS;
    if (id !== IDS.at(-1)) return super.pictureBlob(id);
    return new Promise((_resolve, reject) =>
      signal?.addEventListener("abort", () => reject(signal.reason as Error)),
    );
  }

  override playbackPictureBlob(id: string): Promise<Blob> {
    this.previews.push(id);
    return super.playbackPictureBlob(id);
  }
}

let destroy = () => {};
afterEach(() => destroy());

async function mountLayer(playbackQuality: PlaybackQuality = "4k") {
  const store = new SlowOriginalsStore();
  for (const id of IDS) {
    await store.putPicture(id, { display: new Blob([]), thumbnail: new Blob([]) });
  }
  let closes = 0;
  const mounted = mountWithTranslator(PlayerLayer, {
    store,
    stored: SHOW,
    musicOutput: new MusicOutput(() => null),
    videoElementPool: new VideoElementPool(),
    onClose: () => (closes += 1),
    onError: () => {},
    log: () => {},
    beatPass: { listenFor: () => {} },
    home: "server",
    missing: new SvelteSet<string>(),
    onPictureMissing: () => {},
    playbackQuality,
    clock: () => store.now,
  });
  destroy = mounted.destroy;
  return { store, target: mounted.target, closes: () => closes };
}

function button(target: HTMLElement, name: string): HTMLButtonElement {
  const found = [...target.querySelectorAll("button")].find(
    (candidate) => (candidate.getAttribute("aria-label") ?? candidate.textContent?.trim()) === name,
  );
  if (found === undefined) throw new Error(`no button "${name}"`);
  return found;
}

const preparing = (target: HTMLElement) =>
  whenRendered(target, "h2", (found) => found.textContent === "Bereite Bilder vor");

describe("preparing a server slideshow in the player layer", () => {
  it("prepares 4K from the originals before playing, and plays when asked", async () => {
    const { store, target } = await mountLayer("4k");

    await preparing(target);
    expect(target.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("2");
    expect(target.querySelector(".counter")).toBeNull();

    button(target, "Jetzt starten").click();
    const counter = await whenRendered(target, ".counter");

    expect(counter.textContent).toBe("1 / 3");
    expect(store.previews).toEqual([]);
  });

  it("closes from the prepare screen, cancelling the picture under way", async () => {
    const { store, target, closes } = await mountLayer("4k");
    await preparing(target);

    button(target, "Schließen (Esc)").click();
    flushSync();

    expect(closes()).toBe(1);
    expect(store.signals.get("p3")?.aborted).toBe(true);
  });

  it("plays this time from the previews when asked to play in 1440", async () => {
    const { store, target } = await mountLayer("4k");
    await preparing(target);

    button(target, "In 1440 abspielen").click();
    const counter = await whenRendered(target, ".counter");

    expect(counter.textContent).toBe("1 / 3");
    expect(store.previews.slice(0, 2)).toEqual(["p1", "p2"]);
    expect(store.signals.get("p3")?.aborted).toBe(true);
  });

  it("plays 1440 right after measuring, without preparing", async () => {
    const { store, target } = await mountLayer("1440");

    const counter = await whenRendered(target, ".counter");

    expect(counter.textContent).toBe("1 / 3");
    expect(store.previews.slice(0, 2)).toEqual(["p1", "p2"]);
    expect(target.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("stops with “Immich isn't answering” when Immich fails while preparing", async () => {
    const store = new SlowOriginalsStore();
    store.failure = new ImmichUnavailableError("unreachable");
    const mounted = mountWithTranslator(PlayerLayer, {
      store,
      stored: SHOW,
      musicOutput: new MusicOutput(() => null),
      videoElementPool: new VideoElementPool(),
      onClose: () => {},
      onError: () => {},
      log: () => {},
      beatPass: { listenFor: () => {} },
      home: "server",
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
      playbackQuality: "4k",
      clock: () => store.now,
    });
    destroy = mounted.destroy;

    const alert = await whenRendered(mounted.target, "[role=alert]");

    expect(alert.textContent).toContain("Immich antwortet nicht");
    expect(store.signals.has("p1")).toBe(true);
  });
});
