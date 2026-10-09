import { afterEach, describe, expect, it } from "vitest";
import type { PictureFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput } from "../../player";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
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
    });
    destroy = mounted.destroy;

    const counter = await whenRendered(mounted.target, ".counter");

    expect(counter.textContent).toBe("1 / 1");
    expect(logged).toEqual([new Error("the focus could not be read")]);
    expect(reported).toEqual([]);
  });
});
