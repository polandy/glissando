import { describe, expect, it } from "vitest";
import type { FocusPassPorts } from "./focus-pass";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import type { LibraryStore, StoredSlideshow } from "./stored-slideshow";
import { picture, slideshow } from "./testing/library-store-contract";
import {
  FACES,
  NOTHING,
  thumbnail,
  storeWith,
  answersBy,
  ObservedDetector,
  passOver,
} from "./focus-pass-fixtures";

describe("FocusPass, changes while it runs", () => {
  it("skips the pictures of a slideshow deleted meanwhile, without error or a focus kept for them", async () => {
    const { store, thumbnails } = await storeWith({
      other: ["x"],
      "show-1": ["in-flight", "queued"],
    });
    const fake = new FakeFocusDetector(
      answersBy(thumbnails, { "in-flight": FACES, queued: FACES, x: NOTHING }),
    );
    const detector = new ObservedDetector(fake);
    const { pass, logged, reported } = passOver(store, detector);
    const held = fake.holdNext();
    pass.start();
    await detector.started(1);

    await store.deleteSlideshow("show-1");
    held.release();
    await pass.settled();

    expect((await store.pictureFocus(["x"])).get("x")).toEqual(NOTHING);
    expect(await store.pictureFocus(["in-flight", "queued"])).toEqual(new Map());
    expect(fake.calls).toBe(2);
    expect([...logged, ...reported]).toEqual([]);
  });

  it("includes a slideshow created while it runs, never detecting two pictures at once", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b"] });
    const later = thumbnail("later");
    thumbnails.set("later", later);
    const fake = new FakeFocusDetector(
      answersBy(thumbnails, { a: FACES, b: FACES, later: NOTHING }),
    );
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();
    pass.start();
    await detector.started(1);

    await store.putPicture("later", { display: later, thumbnail: later });
    await store.saveSlideshow(slideshow({ id: "created", pictures: [picture("later")] }));
    pass.start();
    held.release();
    await pass.settled();

    expect((await store.pictureFocus(["later"])).get("later")).toEqual(NOTHING);
    expect((await store.pictureFocus(["a", "b"])).size).toBe(2);
    expect(fake.calls).toBe(3);
    expect(detector.mostAtOnce).toBe(1);
  });

  it("reports an unexpected store error and ends the pass", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const failure = new Error("the database is gone");
    const failing: FocusPassPorts["store"] = {
      listSlideshows: (): Promise<readonly StoredSlideshow[]> => Promise.reject(failure),
      pictureFocus: (ids) => store.pictureFocus(ids),
      thumbnailBlob: (id) => store.thumbnailBlob(id),
      putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
    } satisfies Pick<LibraryStore, keyof FocusPassPorts["store"]>;
    const { pass, reported } = passOver(failing, new FakeFocusDetector(() => FACES));

    pass.start();
    await pass.settled();

    expect(reported).toEqual([failure]);
    expect(pass.state.running).toBe(false);
  });
});
