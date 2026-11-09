import { describe, expect, it } from "vitest";
import type { LibraryStore } from "./library-store";
import { MusicAnalyserGoneError, type MusicAnalysis, type MusicAnalyser } from "./music-analyser";
import {
  MusicAnalysisFailedError,
  MusicAnalysisPass,
  type MusicAnalysisPassPorts,
} from "./music-analysis-pass";
import type { StoredSlideshow } from "./stored-slideshow";
import { FakeMusicAnalyser } from "./testing/fake-music-analyser";
import { musicBlob } from "./testing/library-store-contract";
import {
  addShow,
  answersBy,
  DRUMS,
  LOUD_DRUMS,
  MEASURED,
  NO_CLEAR_BEAT,
  passOver,
  QUIET,
  QUIET_AMBIENT,
  storeWith,
} from "./testing/music-analysis-pass-fixtures";

describe("MusicAnalysisPass", () => {
  it("stores the beats and the loudness the analyser finds for every slideshow's music", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const analyser = new FakeMusicAnalyser(
      answersBy(files, { drums: LOUD_DRUMS, ambient: QUIET_AMBIENT }),
    );
    const { pass, logged, reported } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicBeats("ambient")).toEqual(NO_CLEAR_BEAT);
    expect(await store.musicLoudness("ambient")).toEqual(QUIET);
    expect(pass.state.found).toEqual(
      new Map<string, MusicAnalysis>([
        ["ambient", QUIET_AMBIENT],
        ["drums", LOUD_DRUMS],
      ]),
    );
    expect([...logged, ...reported]).toEqual([]);
  });

  it("stores what the analyser finds for every song of a playlist", async () => {
    const { store, files } = await storeWith({ "show-1": ["drums", "ambient"] });
    const analyser = new FakeMusicAnalyser(
      answersBy(files, { drums: LOUD_DRUMS, ambient: QUIET_AMBIENT }),
    );
    const { pass } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicLoudness("ambient")).toEqual(QUIET);
  });

  it("analyses music two slideshows share once, and music with beats and loudness stored not at all", async () => {
    const { store, files } = await storeWith({
      "show-1": "shared",
      "show-2": "shared",
      "show-3": "known",
    });
    await store.putMusicBeats("known", DRUMS);
    await store.putMusicLoudness("known", MEASURED);
    const analyser = new FakeMusicAnalyser(answersBy(files, { shared: QUIET_AMBIENT }));
    const { pass } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("shared")).toEqual(NO_CLEAR_BEAT);
    expect(analyser.calls).toBe(1);
  });

  it("analyses a track with beats but no loudness and stores both", async () => {
    const { store, files } = await storeWith({ "show-1": "beaty" });
    await store.putMusicBeats("beaty", NO_CLEAR_BEAT);
    const analyser = new FakeMusicAnalyser(answersBy(files, { beaty: LOUD_DRUMS }));
    const { pass } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(analyser.calls).toBe(1);
    expect(await store.musicBeats("beaty")).toEqual(DRUMS);
    expect(await store.musicLoudness("beaty")).toEqual(MEASURED);
  });

  it("analyses a track with loudness but no beats and stores both", async () => {
    const { store, files } = await storeWith({ "show-1": "measured" });
    await store.putMusicLoudness("measured", QUIET);
    const analyser = new FakeMusicAnalyser(answersBy(files, { measured: LOUD_DRUMS }));
    const { pass } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(analyser.calls).toBe(1);
    expect(await store.musicBeats("measured")).toEqual(DRUMS);
    expect(await store.musicLoudness("measured")).toEqual(MEASURED);
  });

  it("marks music as analysed until its results are found, then as found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    const analyser = new FakeMusicAnalyser(answersBy(files, { drums: LOUD_DRUMS }));
    const { pass } = passOver(store, analyser);
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

  it("logs music it cannot analyse, stores nothing for it and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: LOUD_DRUMS });
    const analyser = new FakeMusicAnalyser((blob) => {
      if (blob === files.get("broken")) {
        throw new Error("the music cannot be decoded");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicBeats("broken")).toBeUndefined();
    expect(await store.musicLoudness("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(MusicAnalysisFailedError)]);
    expect((logged[0] as MusicAnalysisFailedError).musicId).toBe("broken");
    expect(reported).toEqual([]);
  });

  it("stops at the first analysis the gone analyser fails, reports it once and leaves the rest for the next pass", async () => {
    const { store, files } = await storeWith({ "show-1": "one", "show-2": "two" });
    let analyserGone = true;
    const answer = answersBy(files, { one: LOUD_DRUMS, two: QUIET_AMBIENT });
    const analyser = new FakeMusicAnalyser((blob) => {
      if (analyserGone) {
        throw new MusicAnalyserGoneError("the analysis worker crashed");
      }
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(reported).toEqual([expect.any(MusicAnalyserGoneError)]);
    expect(analyser.calls).toBe(1);
    expect(logged).toEqual([]);
    expect(pass.state).toMatchObject({ running: false, listening: new Set() });

    analyserGone = false;
    pass.start();
    await pass.settled();

    expect(await store.musicBeats("one")).toEqual(DRUMS);
    expect(await store.musicLoudness("two")).toEqual(QUIET);
  });

  it("takes up music added while it runs, never analysing two tracks at once", async () => {
    const { store, files } = await storeWith({ "show-1": "first" });
    files.set("later", musicBlob("later"));
    let inFlight = 0;
    let mostAtOnce = 0;
    const answer = answersBy(files, { first: LOUD_DRUMS, later: QUIET_AMBIENT });
    const fake = new FakeMusicAnalyser((blob) => answer(blob));
    const observed: MusicAnalyser = {
      async analyse(blob: Blob): Promise<MusicAnalysis> {
        inFlight += 1;
        mostAtOnce = Math.max(mostAtOnce, inFlight);
        try {
          return await fake.analyse(blob);
        } finally {
          inFlight -= 1;
        }
      },
    };
    const held = fake.holdNext();
    const logged: unknown[] = [];
    const pass = new MusicAnalysisPass({
      store,
      analyser: observed,
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
    expect(await store.musicLoudness("first")).toEqual(MEASURED);
    expect(mostAtOnce).toBe(1);
    expect(logged).toEqual([]);
  });

  it("skips music deleted meanwhile, without error or results kept for it", async () => {
    const { store, files } = await storeWith({ "show-1": "in-flight" });
    const analyser = new FakeMusicAnalyser(answersBy(files, { "in-flight": LOUD_DRUMS }));
    const held = analyser.holdNext();
    const { pass, logged, reported } = passOver(store, analyser);
    pass.start();
    await held.started;

    await store.deleteSlideshow("show-1");
    held.release();
    await pass.settled();

    expect(analyser.calls).toBe(1);
    expect(await store.musicBeats("in-flight")).toBeUndefined();
    expect(await store.musicLoudness("in-flight")).toBeUndefined();
    expect([...logged, ...reported]).toEqual([]);
  });

  it("reports an unexpected store error and ends the pass", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const failure = new Error("the database is gone");
    const failing: MusicAnalysisPassPorts["store"] = {
      listSlideshows: (): Promise<readonly StoredSlideshow[]> => Promise.reject(failure),
      musicBeats: (id) => store.musicBeats(id),
      musicLoudness: (id) => store.musicLoudness(id),
      musicBlob: (id) => store.musicBlob(id),
      putMusicBeats: (id, beats) => store.putMusicBeats(id, beats),
      putMusicLoudness: (id, loudness) => store.putMusicLoudness(id, loudness),
    } satisfies Pick<LibraryStore, keyof MusicAnalysisPassPorts["store"]>;
    const { pass, reported } = passOver(failing, new FakeMusicAnalyser(() => LOUD_DRUMS));

    pass.start();
    await pass.settled();

    expect(reported).toEqual([failure]);
    expect(pass.state.running).toBe(false);
  });
});
