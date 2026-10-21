import { describe, expect, it } from "vitest";
import { FocusPass, type FocusPassPorts } from "../library/focus-pass";
import { FACES, storedFocus } from "../library/focus-pass-fixtures";
import { FakeFocusDetector } from "../library/testing/fake-focus-detector";
import type { ServerSlideshowStore } from "./server-slideshow-store";
import { linkedPicture, serverSlideshow, serverStoreHarness } from "./testing/server-store-harness";

const OWN_MOTION = {
  from: { zoom: 2, centerX: 0.4, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};

/**
 * As the server pass sees the store (`main.ts`): `pictureFocusForPass`, `FACES` found directly
 * without a real detection. `puts` names every picture a focus was actually PUT for, so a test can
 * tell a `lookAgain` that did nothing from one that put a focus again.
 */
function serverPassStore(store: ServerSlideshowStore, puts: string[]): FocusPassPorts["store"] {
  return {
    listSlideshows: () => store.listSlideshows(),
    pictureFocus: (ids) => store.pictureFocusForPass(ids),
    thumbnailBlob: (id) => store.thumbnailBlob(id),
    putPictureFocus: (id, focus) => {
      puts.push(id);
      return store.putPictureFocus(id, focus);
    },
    detectionInput: () => Promise.resolve(FACES),
  };
}

function passOverServer(store: ServerSlideshowStore, puts: string[] = []): FocusPass {
  return new FocusPass({
    store: serverPassStore(store, puts),
    detector: new FakeFocusDetector(() => {
      throw new Error("detectionInput already answers a PictureFocus; the detector must not run");
    }),
    log: () => undefined,
    reportError: () => undefined,
  });
}

describe("the server focus pass, what it writes (ADR-0041)", () => {
  it("writes only the focus it found, leaving the slideshow document and its revision untouched", async () => {
    const { store, client, seed } = serverStoreHarness();
    const seeded = await seed(
      serverSlideshow({ pictures: [{ ...linkedPicture("asset-1"), kenBurns: OWN_MOTION }] }),
    );
    const before = await client.getSlideshow(seeded.id);

    const pass = passOverServer(store);
    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["asset-1"])).toEqual(
      new Map([["asset-1", storedFocus(FACES)]]),
    );
    const after = await client.getSlideshow(seeded.id);
    expect(after.revision).toBe(before.revision);
    expect(after.document.slideshow.pictures[0]?.kenBurns).toEqual(OWN_MOTION);
  });

  it("writes only the focus found through lookAgain, leaving the document and its revision untouched", async () => {
    const { store, client, seed } = serverStoreHarness();
    const seeded = await seed(
      serverSlideshow({ pictures: [{ ...linkedPicture("asset-1"), kenBurns: OWN_MOTION }] }),
    );
    // Lets a pass confirm an initial focus first, as production code would before any
    // "look again" is asked for; its own put is not what this test is about.
    await (() => {
      const firstPass = passOverServer(store);
      firstPass.start();
      return firstPass.settled();
    })();
    const before = await client.getSlideshow(seeded.id);

    const puts: string[] = [];
    const pass = passOverServer(store, puts);
    pass.lookAgain(["asset-1"]);
    await pass.settled();

    // The positive signal that lookAgain, not just an already-settled pass, did the work.
    expect(puts).toEqual(["asset-1"]);
    expect(await store.pictureFocus(["asset-1"])).toEqual(
      new Map([["asset-1", storedFocus(FACES)]]),
    );
    const after = await client.getSlideshow(seeded.id);
    expect(after.revision).toBe(before.revision);
    expect(after.document.slideshow.pictures[0]?.kenBurns).toEqual(OWN_MOTION);
  });
});
