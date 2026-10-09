import { describe, expect, it } from "vitest";
import { FocusDetectionFailedError, FocusPass, type FocusPassPorts } from "./focus-pass";
import type { FocusDetector } from "./focus-detector";
import type { PictureFocus } from "./picture-focus";
import type { LibraryStore, StoredSlideshow } from "./stored-slideshow";
import { FakeFocusDetector } from "./testing/fake-focus-detector";
import { picture, slideshow } from "./testing/library-store-contract";
import { MemoryLibraryStore } from "./testing/memory-store";

const FACES: PictureFocus = { kind: "subject", box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 } };
const NOTHING: PictureFocus = { kind: "none" };

const thumbnail = (id: string): Blob => new Blob([`${id} thumbnail`], { type: "image/jpeg" });

/**
 * A store holding a slideshow per entry, each created a day after the one before (the pass takes
 * the newest first); each picture's thumbnail is the one returned.
 */
async function storeWith(
  shows: Record<string, readonly string[]>,
): Promise<{ store: MemoryLibraryStore; thumbnails: Map<string, Blob> }> {
  const store = new MemoryLibraryStore();
  const thumbnails = new Map<string, Blob>();
  for (const [day, [id, pictureIds]] of Object.entries(shows).entries()) {
    for (const pictureId of pictureIds) {
      const blob = thumbnail(pictureId);
      thumbnails.set(pictureId, blob);
      await store.putPicture(pictureId, { display: blob, thumbnail: blob });
    }
    const createdAt = new Date(Date.UTC(2025, 6, 1 + day)).toISOString();
    await store.saveSlideshow(slideshow({ id, createdAt, pictures: pictureIds.map(picture) }));
  }
  return { store, thumbnails };
}

/** Answers by which picture's thumbnail it is given; throws for one it does not know. */
function answersBy(thumbnails: Map<string, Blob>, focus: Record<string, PictureFocus>) {
  return (blob: Blob): PictureFocus => {
    const id = [...thumbnails].find(([, candidate]) => candidate === blob)?.[0];
    const answer = id === undefined ? undefined : focus[id];
    if (answer === undefined) {
      throw new Error(`no detection answer for picture "${id ?? "unknown"}"`);
    }
    return answer;
  };
}

/** Wraps a detector: tells when the n-th detection starts and how many ever ran at once. */
class ObservedDetector implements FocusDetector {
  readonly #inner: FocusDetector;
  readonly #starts: PromiseWithResolvers<undefined>[] = [];
  #calls = 0;
  #inFlight = 0;
  mostAtOnce = 0;

  constructor(inner: FocusDetector) {
    this.#inner = inner;
  }

  /** Resolves once detection number `count` (from 1) has started. */
  started(count: number): Promise<void> {
    return this.#start(count).promise;
  }

  async detect(blob: Blob): Promise<PictureFocus> {
    this.#calls += 1;
    this.#inFlight += 1;
    this.mostAtOnce = Math.max(this.mostAtOnce, this.#inFlight);
    this.#start(this.#calls).resolve(undefined);
    try {
      return await this.#inner.detect(blob);
    } finally {
      this.#inFlight -= 1;
    }
  }

  #start(count: number): PromiseWithResolvers<undefined> {
    const existing = this.#starts[count];
    if (existing !== undefined) {
      return existing;
    }
    const created = Promise.withResolvers<undefined>();
    this.#starts[count] = created;
    return created;
  }
}

function passOver(
  store: FocusPassPorts["store"],
  detector: FocusDetector,
): { pass: FocusPass; logged: unknown[]; reported: unknown[] } {
  const logged: unknown[] = [];
  const reported: unknown[] = [];
  const pass = new FocusPass({
    store,
    detector,
    log: (error) => logged.push(error),
    reportError: (error) => reported.push(error),
  });
  return { pass, logged, reported };
}

describe("FocusPass", () => {
  it("stores what the detector finds for every picture of every slideshow", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b"], "show-2": ["c"] });
    const detector = new FakeFocusDetector(
      answersBy(thumbnails, { a: FACES, b: NOTHING, c: FACES }),
    );
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a", "b", "c"])).toEqual(
      new Map<string, PictureFocus>([
        ["a", FACES],
        ["b", NOTHING],
        ["c", FACES],
      ]),
    );
  });

  it("does not look again at a picture whose focus is stored", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["looked-at", "new"] });
    await store.putPictureFocus("looked-at", NOTHING);
    const detector = new FakeFocusDetector(answersBy(thumbnails, { new: FACES }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["new"])).get("new")).toEqual(FACES);
    expect(detector.calls).toBe(1);
  });

  it("tells per slideshow how many of the pictures to look at are done, while it searches", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a", "b", "c"], "show-2": ["d"] });
    await store.putPictureFocus("c", NOTHING);
    const fake = new FakeFocusDetector(answersBy(thumbnails, { a: FACES, b: FACES, d: FACES }));
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const progress: string[] = [];
    pass.subscribe((state) => {
      const shows = [...state.slideshows].map(([id, { done, total }]) => `${id} ${done}/${total}`);
      progress.push(`${state.running ? "running" : "idle"}: ${shows.join(", ")}`);
    });
    const held = fake.holdNext();

    pass.start();
    await detector.started(1);

    expect(pass.state.running).toBe(true);
    expect(pass.state.slideshows).toEqual(
      new Map([
        ["show-1", { done: 0, total: 2 }],
        ["show-2", { done: 0, total: 1 }],
      ]),
    );
    held.release();
    await pass.settled();
    expect(progress.some((line) => line.startsWith("running: show-1 1/2"))).toBe(true);
    expect(progress.at(-1)).toBe("idle: ");
    expect(pass.state.slideshows).toEqual(new Map());
  });

  it("marks a picture as searched for until its focus is found, then as found", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const fake = new FakeFocusDetector(answersBy(thumbnails, { a: FACES }));
    const detector = new ObservedDetector(fake);
    const { pass } = passOver(store, detector);
    const held = fake.holdNext();

    pass.start();
    await detector.started(1);

    expect(pass.state.searching.has("a")).toBe(true);
    expect(pass.state.found.has("a")).toBe(false);
    held.release();
    await pass.settled();
    expect(pass.state.found.get("a")).toEqual(FACES);
    expect(pass.state.searching.has("a")).toBe(false);
  });

  it("logs a failed detection, stores nothing for that picture and carries on", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["broken", "fine"] });
    const detector = new FakeFocusDetector(answersBy(thumbnails, { fine: FACES }));
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["fine"])).get("fine")).toEqual(FACES);
    expect((await store.pictureFocus(["broken"])).has("broken")).toBe(false);
    expect(logged).toEqual([expect.any(FocusDetectionFailedError)]);
    expect((logged[0] as FocusDetectionFailedError).pictureId).toBe("broken");
    expect(reported).toEqual([]);
  });

  it("looks again at a picture whose detection failed on the next pass", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["flaky"] });
    let detectorWorks = false;
    const answer = answersBy(thumbnails, { flaky: FACES });
    const detector = new FakeFocusDetector((blob) => {
      if (!detectorWorks) {
        throw new Error("the worker failed");
      }
      return answer(blob);
    });
    const { pass } = passOver(store, detector);
    pass.start();
    await pass.settled();
    expect((await store.pictureFocus(["flaky"])).has("flaky")).toBe(false);

    detectorWorks = true;
    pass.start();
    await pass.settled();

    expect((await store.pictureFocus(["flaky"])).get("flaky")).toEqual(FACES);
  });

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
