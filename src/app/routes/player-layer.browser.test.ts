import { SvelteSet } from "svelte/reactivity";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import type { StoredFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput } from "../../player";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import PlayerLayer from "./PlayerLayer.svelte";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    {
      id: "a",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 100,
      height: 100,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  secondsPerPicture: 5,
  songs: [],
};

/** A store whose focus cannot be read, as when the browser's database refuses the read. */
class FocusUnreadableStore extends MemoryLibraryStore {
  override pictureFocus(): Promise<ReadonlyMap<string, StoredFocus>> {
    return Promise.reject(new Error("the focus could not be read"));
  }
}

let destroy = () => {};
afterEach(() => destroy());

describe("the player layer", () => {
  it("still plays, aiming at the middle, when the stored focus cannot be read", async () => {
    const store = new FocusUnreadableStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const logged: unknown[] = [];
    const listenedFor: string[] = [];
    const mounted = mountWithTranslator(PlayerLayer, {
      store,
      stored: SHOW,
      musicOutput: new MusicOutput(() => null),
      decodeClipSound: () => Promise.resolve(null),
      onClose: () => {},
      log: (error: unknown) => logged.push(error),
      analysisPass: { listenFor: (musicId: string) => listenedFor.push(musicId) },
      home: "device",
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
      playbackQuality: "1440",
      clock: () => 0,
      startPicture: null,
    });
    destroy = mounted.destroy;

    const counter = await whenRendered(mounted.target, ".counter");

    expect(counter.textContent).toBe("1 / 1");
    expect(logged).toEqual([new Error("the focus could not be read")]);
    expect(listenedFor).toEqual([]);
  });

  it("listens for the beats of the music as it opens, for the next time it plays", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const listenedFor: string[] = [];
    const mounted = mountWithTranslator(PlayerLayer, {
      store,
      stored: {
        ...SHOW,
        songs: [{ id: "tune", fileName: "tune.mp3", durationMs: 5000, mimeType: "audio/mpeg" }],
      },
      musicOutput: new MusicOutput(() => null),
      decodeClipSound: () => Promise.resolve(null),
      onClose: () => {},
      log: () => {},
      analysisPass: { listenFor: (musicId: string) => listenedFor.push(musicId) },
      home: "server",
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
      playbackQuality: "1440",
      clock: () => 0,
      startPicture: null,
    });
    destroy = mounted.destroy;

    expect(listenedFor).toEqual(["tune"]);
  });

  it("shows the failure with a way out when the music cannot be read", async () => {
    const unreadable = new Error("the music could not be read");
    class MusicUnreadableStore extends MemoryLibraryStore {
      override musicBlob(): Promise<Blob> {
        return Promise.reject(unreadable);
      }
    }
    const logged: unknown[] = [];
    let closed = 0;
    const mounted = mountWithTranslator(PlayerLayer, {
      store: new MusicUnreadableStore(),
      stored: {
        ...SHOW,
        songs: [{ id: "tune", fileName: "tune.mp3", durationMs: 5000, mimeType: "audio/mpeg" }],
      },
      musicOutput: new MusicOutput(() => null),
      decodeClipSound: () => Promise.resolve(null),
      onClose: () => closed++,
      log: (error: unknown) => logged.push(error),
      analysisPass: { listenFor: () => {} },
      home: "device",
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
      playbackQuality: "1440",
      clock: () => 0,
      startPicture: null,
    });
    destroy = mounted.destroy;

    const alert = await whenRendered(mounted.target, "[role=alert]");
    alert.querySelector("button")?.click();

    expect(alert.textContent).toContain("Die Diashow konnte nicht abgespielt werden.");
    expect(logged).toEqual([unreadable]);
    expect(closed).toBe(1);
  });
});

const PICTURE = {
  capturedAt: "2025-07-01T10:00:00Z",
  width: 100,
  height: 100,
  colours: { veil: "#404040", accent: "#C0C0C0" },
};
const TWO_PICTURES: StoredSlideshow = {
  ...SHOW,
  pictures: [
    { ...PICTURE, id: "gone", fileName: "gone.jpg" },
    { ...PICTURE, id: "kept", fileName: "kept.jpg" },
  ],
};

/** A server slideshow's store: `failing` fails with `failure`, the other pictures load. */
async function serverStore(failing: string, failure: Error) {
  class FailingStore extends MemoryLibraryStore {
    override playbackPictureBlob(id: string): Promise<Blob> {
      return id === failing ? Promise.reject(failure) : super.playbackPictureBlob(id);
    }
  }
  const store = new FailingStore();
  await store.putPicture("kept", { display: new Blob([]), thumbnail: new Blob([]) });
  return store;
}

function mountServerLayer(store: MemoryLibraryStore, missing = new SvelteSet<string>()) {
  const mounted = mountWithTranslator(PlayerLayer, {
    store,
    stored: TWO_PICTURES,
    musicOutput: new MusicOutput(() => null),
    decodeClipSound: () => Promise.resolve(null),
    onClose: () => {},
    log: () => {},
    analysisPass: { listenFor: () => {} },
    home: "server",
    missing,
    onPictureMissing: (id: string) => missing.add(id),
    playbackQuality: "1440",
    clock: () => 0,
    startPicture: null,
  });
  destroy = mounted.destroy;
  return { ...mounted, missing };
}

describe("the player layer of a server slideshow", () => {
  it("plays without the pictures already known to be missing from Immich", async () => {
    const store = await serverStore("gone", new PictureMissingFromImmichError("gone"));
    const { target } = mountServerLayer(store, new SvelteSet(["gone"]));

    const counter = await whenRendered(target, ".counter");

    expect(counter.textContent).toBe("1 / 1");
  });

  it("skips a picture Immich answers 404 for and tells the screen it is missing", async () => {
    const store = await serverStore("gone", new PictureMissingFromImmichError("gone"));
    const { target, missing } = mountServerLayer(store);

    const counter = await whenRendered(
      target,
      ".counter",
      (found) => found.textContent === "1 / 1",
    );

    expect(counter.textContent).toBe("1 / 1");
    expect([...missing]).toEqual(["gone"]);
    expect(target.querySelector("[role=alert]")).toBeNull();
  });

  it("stops with “Immich isn't answering” on any other failure", async () => {
    const store = await serverStore("gone", new ImmichUnavailableError("unreachable"));
    const { target } = mountServerLayer(store);

    const alert = await whenRendered(target, "[role=alert]");

    expect(alert.textContent).toContain("Immich antwortet nicht");
  });
});

/**
 * A store recording the pictures the player asks for; a playback rendition is never answered, so
 * only the pictures the player loads ahead at first are ever asked for.
 */
class PlaybackRecordingStore extends MemoryLibraryStore {
  readonly played: string[] = [];
  readonly #firstStep: number;
  readonly #firstPlayed = Promise.withResolvers<undefined>();
  /** Resolves once the player asked for as many pictures as its first step holds. */
  readonly firstPlayed = this.#firstPlayed.promise;

  constructor(firstStep: number) {
    super();
    this.#firstStep = firstStep;
  }

  override pictureBlob(id: string): Promise<Blob> {
    return Promise.reject(new Error(`playing read the stored rendition of "${id}"`));
  }

  override playbackPictureBlob(id: string): Promise<Blob> {
    this.played.push(id);
    if (this.played.length === this.#firstStep) this.#firstPlayed.resolve(undefined);
    return new Promise<Blob>(() => {});
  }
}

const FIVE_PICTURES: StoredSlideshow = {
  ...SHOW,
  pictures: ["p1", "p2", "p3", "p4", "p5"].map((id) => ({ ...PICTURE, id, fileName: `${id}.jpg` })),
};

describe("the pictures the player layer loads ahead", () => {
  it.each([
    ["server", ["p1", "p2", "p3"]],
    ["device", ["p1", "p2"]],
  ] as const)("plays a %s slideshow's playback renditions, %j first", async (home, first) => {
    const store = new PlaybackRecordingStore(first.length);
    for (const { id } of FIVE_PICTURES.pictures) {
      await store.putPicture(id, { display: new Blob([]), thumbnail: new Blob([]) });
    }
    const mounted = mountWithTranslator(PlayerLayer, {
      store,
      stored: FIVE_PICTURES,
      musicOutput: new MusicOutput(() => null),
      decodeClipSound: () => Promise.resolve(null),
      onClose: () => {},
      log: () => {},
      analysisPass: { listenFor: () => {} },
      home,
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
      playbackQuality: "1440",
      clock: () => 0,
      startPicture: null,
    });
    destroy = mounted.destroy;

    await store.firstPlayed;

    expect(store.played).toEqual(first);
  });
});
