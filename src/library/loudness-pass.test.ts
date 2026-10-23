import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../loudness";
import { LoudnessMeterGoneError } from "./loudness-meter";
import {
  LoudnessMeasurementFailedError,
  LoudnessPass,
  type LoudnessPassPorts,
} from "./loudness-pass";
import type { LibraryStore } from "./library-store";
import type { StoredSlideshow } from "./stored-slideshow";
import {
  addShow,
  answersBy,
  MEASURED,
  passOver,
  QUIET,
  storeWith,
} from "./testing/loudness-pass-fixtures";
import { FakeLoudnessMeter } from "./testing/fake-loudness-meter";
import { musicBlob } from "./testing/library-store-contract";

describe("LoudnessPass", () => {
  it("stores what the meter measures for every slideshow's music", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const meter = new FakeLoudnessMeter(answersBy(files, { drums: MEASURED, ambient: QUIET }));
    const { pass, logged, reported } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicLoudness("ambient")).toEqual(QUIET);
    expect(pass.state.found).toEqual(
      new Map<string, MusicLoudness>([
        ["ambient", QUIET],
        ["drums", MEASURED],
      ]),
    );
    expect([...logged, ...reported]).toEqual([]);
  });

  it("stores what the meter measures for every song of a playlist", async () => {
    const { store, files } = await storeWith({ "show-1": ["drums", "ambient"] });
    const meter = new FakeLoudnessMeter(answersBy(files, { drums: MEASURED, ambient: QUIET }));
    const { pass } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicLoudness("ambient")).toEqual(QUIET);
  });

  it("measures once music two slideshows share, and not again music with stored loudness", async () => {
    const { store, files } = await storeWith({
      "show-1": "shared",
      "show-2": "shared",
      "show-3": "known",
    });
    await store.putMusicLoudness("known", MEASURED);
    const meter = new FakeLoudnessMeter(answersBy(files, { shared: QUIET }));
    const { pass } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("shared")).toEqual(QUIET);
    expect(meter.calls).toBe(1);
  });

  it("marks music as listened to until its loudness is found, then as found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    const meter = new FakeLoudnessMeter(answersBy(files, { drums: MEASURED }));
    const { pass } = passOver(store, meter);
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

  it("logs music it cannot measure, stores nothing for it and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: MEASURED });
    const meter = new FakeLoudnessMeter((blob) => {
      if (blob === files.get("broken")) {
        throw new Error("the music cannot be decoded");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicLoudness("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(LoudnessMeasurementFailedError)]);
    expect((logged[0] as LoudnessMeasurementFailedError).musicId).toBe("broken");
    expect(reported).toEqual([]);
  });

  it("stops at the first measurement the gone meter fails, reports it once and leaves the rest for the next pass", async () => {
    const { store, files } = await storeWith({ "show-1": "one", "show-2": "two" });
    let meterGone = true;
    const answer = answersBy(files, { one: MEASURED, two: QUIET });
    const meter = new FakeLoudnessMeter((blob) => {
      if (meterGone) {
        throw new LoudnessMeterGoneError("the loudness worker crashed");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(reported).toEqual([expect.any(LoudnessMeterGoneError)]);
    expect(meter.calls).toBe(1);
    expect(logged).toEqual([]);
    expect(pass.state).toMatchObject({ running: false, listening: new Set() });

    meterGone = false;
    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("one")).toEqual(MEASURED);
    expect(await store.musicLoudness("two")).toEqual(QUIET);
  });

  it("takes up music added while it runs, never measuring two tracks at once", async () => {
    const { store, files } = await storeWith({ "show-1": "first" });
    files.set("later", musicBlob("later"));
    let inFlight = 0;
    let mostAtOnce = 0;
    const answer = answersBy(files, { first: MEASURED, later: QUIET });
    const meter = new FakeLoudnessMeter((blob) => answer(blob));
    const observed = {
      async measure(blob: Blob): Promise<MusicLoudness> {
        inFlight += 1;
        mostAtOnce = Math.max(mostAtOnce, inFlight);
        try {
          return await meter.measure(blob);
        } finally {
          inFlight -= 1;
        }
      },
    };
    const held = meter.holdNext();
    const logged: unknown[] = [];
    const pass = new LoudnessPass({
      store,
      meter: observed,
      log: (error) => logged.push(error),
      reportError: (error) => logged.push(error),
    });
    pass.start();
    await held.started;

    await addShow(store, files, "created", "later", 5);
    pass.start();
    held.release();
    await pass.settled();

    expect(await store.musicLoudness("later")).toEqual(QUIET);
    expect(await store.musicLoudness("first")).toEqual(MEASURED);
    expect(mostAtOnce).toBe(1);
    expect(logged).toEqual([]);
  });

  it("skips music deleted meanwhile, without error or loudness kept for it", async () => {
    const { store, files } = await storeWith({ "show-1": "in-flight" });
    const meter = new FakeLoudnessMeter(answersBy(files, { "in-flight": MEASURED }));
    const held = meter.holdNext();
    const { pass, logged, reported } = passOver(store, meter);
    pass.start();
    await held.started;

    await store.deleteSlideshow("show-1");
    held.release();
    await pass.settled();

    expect(meter.calls).toBe(1);
    expect(await store.musicLoudness("in-flight")).toBeUndefined();
    expect([...logged, ...reported]).toEqual([]);
  });

  it("reports an unexpected store error and ends the pass", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const failure = new Error("the database is gone");
    const failing: LoudnessPassPorts["store"] = {
      listSlideshows: (): Promise<readonly StoredSlideshow[]> => Promise.reject(failure),
      musicLoudness: (id) => store.musicLoudness(id),
      musicBlob: (id) => store.musicBlob(id),
      putMusicLoudness: (id, loudness) => store.putMusicLoudness(id, loudness),
    } satisfies Pick<LibraryStore, keyof LoudnessPassPorts["store"]>;
    const { pass, reported } = passOver(failing, new FakeLoudnessMeter(() => MEASURED));

    pass.start();
    await pass.settled();

    expect(reported).toEqual([failure]);
    expect(pass.state.running).toBe(false);
  });
});
