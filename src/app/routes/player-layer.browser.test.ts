import { SvelteSet } from "svelte/reactivity";
import { afterEach, describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import type { PictureFocus } from "../../library/picture-focus";
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
    },
  ],
  secondsPerPicture: 5,
};

/** A store whose focus cannot be read, as when the browser's database refuses the read. */
class FocusUnreadableStore extends MemoryLibraryStore {
  override pictureFocus(): Promise<ReadonlyMap<string, PictureFocus>> {
    return Promise.reject(new Error("the focus could not be read"));
  }
}

let destroy = () => {};
afterEach(() => destroy());

describe("the player layer", () => {
  it("still plays, aiming at the middle, when the stored focus cannot be read", async () => {
    const store = new FocusUnreadableStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const reported: unknown[] = [];
    const logged: unknown[] = [];
    const mounted = mountWithTranslator(PlayerLayer, {
      store,
      stored: SHOW,
      musicOutput: new MusicOutput(() => null),
      onClose: () => {},
      onError: (error: unknown) => reported.push(error),
      log: (error: unknown) => logged.push(error),
      home: "device",
      missing: new SvelteSet<string>(),
      onPictureMissing: () => {},
    });
    destroy = mounted.destroy;

    const counter = await whenRendered(mounted.target, ".counter");

    expect(counter.textContent).toBe("1 / 1");
    expect(logged).toEqual([new Error("the focus could not be read")]);
    expect(reported).toEqual([]);
  });
});

const PICTURE = {
  capturedAt: "2025-07-01T10:00:00Z",
  width: 100,
  height: 100,
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
    override pictureBlob(id: string): Promise<Blob> {
      return id === failing ? Promise.reject(failure) : super.pictureBlob(id);
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
    onClose: () => {},
    onError: () => {},
    log: () => {},
    home: "server",
    missing,
    onPictureMissing: (id: string) => missing.add(id),
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
