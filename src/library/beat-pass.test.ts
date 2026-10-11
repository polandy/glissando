import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../beats";
import { BeatDetectorGoneError } from "./beat-detector";
import { BeatDetectionFailedError, BeatPass, type BeatPassPorts } from "./beat-pass";
import type { LibraryStore, StoredSlideshow } from "./stored-slideshow";
import {
  addShow,
  answersBy,
  DRUMS,
  NO_CLEAR_BEAT,
  passOver,
  storeWith,
} from "./testing/beat-pass-fixtures";
import { FakeBeatDetector } from "./testing/fake-beat-detector";
import { musicBlob } from "./testing/library-store-contract";

describe("BeatPass", () => {
  it("stores what the detector finds for every slideshow's music, beats or none", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const detector = new FakeBeatDetector(
      answersBy(files, { drums: DRUMS, ambient: NO_CLEAR_BEAT }),
    );
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicBeats("ambient")).toEqual(NO_CLEAR_BEAT);
    expect(pass.state.found).toEqual(
      new Map<string, MusicBeats>([
        ["ambient", NO_CLEAR_BEAT],
        ["drums", DRUMS],
      ]),
    );
    expect([...logged, ...reported]).toEqual([]);
  });

  it("stores what the detector finds for every song of a playlist", async () => {
    const { store, files } = await storeWith({ "show-1": ["drums", "ambient"] });
    const detector = new FakeBeatDetector(
      answersBy(files, { drums: DRUMS, ambient: NO_CLEAR_BEAT }),
    );
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicBeats("ambient")).toEqual(NO_CLEAR_BEAT);
  });

  it("listens once to music two slideshows share, and not again to music with stored beats", async () => {
    const { store, files } = await storeWith({
      "show-1": "shared",
      "show-2": "shared",
      "show-3": "known",
    });
    await store.putMusicBeats("known", DRUMS);
    const detector = new FakeBeatDetector(answersBy(files, { shared: NO_CLEAR_BEAT }));
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("shared")).toEqual(NO_CLEAR_BEAT);
    expect(detector.calls).toBe(1);
  });

  it("marks music as listened to until its beats are found, then as found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    const detector = new FakeBeatDetector(answersBy(files, { drums: DRUMS }));
    const { pass } = passOver(store, detector);
    const states: { listening: string[]; found: string[] }[] = [];
    pass.subscribe((state) =>
      states.push({ listening: [...state.listening], found: [...state.found.keys()] }),
    );

    pass.start();
    await pass.settled();

    expect(states).toContainEqual({ listening: ["drums"], found: [] });
    expect(states.at(-1)).toEqual({ listening: [], found: ["drums"] });
    expect(pass.state.running).toBe(false);
  });

  it("logs music it cannot listen to, stores nothing for it and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: DRUMS });
    const detector = new FakeBeatDetector((blob) => {
      if (blob === files.get("broken")) {
        throw new Error("the music cannot be decoded");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicBeats("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(BeatDetectionFailedError)]);
    expect((logged[0] as BeatDetectionFailedError).musicId).toBe("broken");
    expect(reported).toEqual([]);
  });

  it("stops at the first detection the gone detector fails, reports it once and leaves the rest for the next pass", async () => {
    const { store, files } = await storeWith({ "show-1": "one", "show-2": "two" });
    let detectorGone = true;
    const answer = answersBy(files, { one: DRUMS, two: NO_CLEAR_BEAT });
    const detector = new FakeBeatDetector((blob) => {
      if (detectorGone) {
        throw new BeatDetectorGoneError("the beat worker crashed");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(reported).toEqual([expect.any(BeatDetectorGoneError)]);
    expect(detector.calls).toBe(1);
    expect(logged).toEqual([]);
    expect(pass.state).toMatchObject({ running: false, listening: new Set() });

    detectorGone = false;
    pass.start();
    await pass.settled();

    expect(await store.musicBeats("one")).toEqual(DRUMS);
    expect(await store.musicBeats("two")).toEqual(NO_CLEAR_BEAT);
  });

  it("takes up music added while it runs, never listening to two tracks at once", async () => {
    const { store, files } = await storeWith({ "show-1": "first" });
    files.set("later", musicBlob("later"));
    let inFlight = 0;
    let mostAtOnce = 0;
    const answer = answersBy(files, { first: DRUMS, later: NO_CLEAR_BEAT });
    const detector = new FakeBeatDetector((blob) => answer(blob));
    const observed = {
      async detect(blob: Blob): Promise<MusicBeats> {
        inFlight += 1;
        mostAtOnce = Math.max(mostAtOnce, inFlight);
        try {
          return await detector.detect(blob);
        } finally {
          inFlight -= 1;
        }
      },
    };
    const held = detector.holdNext();
    const logged: unknown[] = [];
    const pass = new BeatPass({
      store,
      detector: observed,
      log: (error) => logged.push(error),
      reportError: (error) => logged.push(error),
    });
    pass.start();
    await held.started;

    await addShow(store, files, "created", "later", 5);
    pass.start();
    held.release();
    await pass.settled();

    expect(await store.musicBeats("later")).toEqual(NO_CLEAR_BEAT);
    expect(await store.musicBeats("first")).toEqual(DRUMS);
    expect(mostAtOnce).toBe(1);
    expect(logged).toEqual([]);
  });

  it("skips music deleted meanwhile, without error or beats kept for it", async () => {
    const { store, files } = await storeWith({ "show-1": "in-flight" });
    const detector = new FakeBeatDetector(answersBy(files, { "in-flight": DRUMS }));
    const held = detector.holdNext();
    const { pass, logged, reported } = passOver(store, detector);
    pass.start();
    await held.started;

    await store.deleteSlideshow("show-1");
    held.release();
    await pass.settled();

    expect(detector.calls).toBe(1);
    expect(await store.musicBeats("in-flight")).toBeUndefined();
    expect([...logged, ...reported]).toEqual([]);
  });

  it("reports an unexpected store error and ends the pass", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const failure = new Error("the database is gone");
    const failing: BeatPassPorts["store"] = {
      listSlideshows: (): Promise<readonly StoredSlideshow[]> => Promise.reject(failure),
      musicBeats: (id) => store.musicBeats(id),
      musicBlob: (id) => store.musicBlob(id),
      putMusicBeats: (id, beats) => store.putMusicBeats(id, beats),
    } satisfies Pick<LibraryStore, keyof BeatPassPorts["store"]>;
    const { pass, reported } = passOver(failing, new FakeBeatDetector(() => DRUMS));

    pass.start();
    await pass.settled();

    expect(reported).toEqual([failure]);
    expect(pass.state.running).toBe(false);
  });
});
