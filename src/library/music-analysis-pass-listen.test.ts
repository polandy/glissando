import { describe, expect, it } from "vitest";
import { MusicAnalyserGoneError, MusicUndecodableError } from "./music-analyser";
import { MusicAnalysisFailedError } from "./music-analysis-pass";
import { FakeMusicAnalyser } from "./testing/fake-music-analyser";
import {
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

describe("MusicAnalysisPass.listenFor", () => {
  it("analyses the one track asked for, not every slideshow's music", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const analyser = new FakeMusicAnalyser(answersBy(files, { drums: LOUD_DRUMS }));
    const { pass, logged, reported } = passOver(store, analyser);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicBeats("ambient")).toBeUndefined();
    expect(analyser.calls).toBe(1);
    expect([...logged, ...reported]).toEqual([]);
  });

  it("does not analyse again a track with beats and loudness stored", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    await store.putMusicBeats("drums", NO_CLEAR_BEAT);
    await store.putMusicLoudness("drums", QUIET);
    const analyser = new FakeMusicAnalyser(answersBy(files, {}));
    const { pass } = passOver(store, analyser);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(NO_CLEAR_BEAT);
    expect(analyser.calls).toBe(0);
  });

  it("analyses a track asked for that has beats but no loudness", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    await store.putMusicBeats("drums", NO_CLEAR_BEAT);
    const analyser = new FakeMusicAnalyser(answersBy(files, { drums: LOUD_DRUMS }));
    const { pass } = passOver(store, analyser);

    pass.listenFor("drums");
    await pass.settled();

    expect(analyser.calls).toBe(1);
    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
  });

  it("takes the track asked for up next while the pass runs, ahead of the music queued", async () => {
    const { store, files } = await storeWith({
      "show-1": "asked",
      "show-2": "queued",
      "show-3": "first",
    });
    const order: string[] = [];
    const answer = answersBy(files, {
      first: LOUD_DRUMS,
      queued: LOUD_DRUMS,
      asked: QUIET_AMBIENT,
    });
    const analyser = new FakeMusicAnalyser((blob) => {
      order.push([...files].find(([, file]) => file === blob)?.[0] ?? "unknown");
      return answer(blob);
    });
    const { pass } = passOver(store, analyser);
    const held = analyser.holdNext();

    pass.start();
    await held.started;
    pass.listenFor("asked");
    held.release();
    await pass.settled();

    expect(order).toEqual(["first", "asked", "queued"]);
    expect(await store.musicBeats("asked")).toEqual(NO_CLEAR_BEAT);
  });
});

describe("MusicAnalysisPass with music it cannot decode", () => {
  it("marks the track undecodable, logs it, stores nothing and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: LOUD_DRUMS });
    const analyser = new FakeMusicAnalyser((blob) => {
      if (blob === files.get("broken")) throw new MusicUndecodableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(pass.state.undecodable).toEqual(new Set(["broken"]));
    expect(await store.musicBeats("broken")).toBeUndefined();
    expect(await store.musicLoudness("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(MusicAnalysisFailedError)]);
    expect(reported).toEqual([]);
  });

  it("does not take an analysis that failed otherwise for undecodable music", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const analyser = new FakeMusicAnalyser(() => {
      throw new Error("the worker could not finish");
    });
    const { pass, logged } = passOver(store, analyser);

    pass.start();
    await pass.settled();

    expect(logged).toEqual([expect.any(MusicAnalysisFailedError)]);
    expect(pass.state.undecodable).toEqual(new Set());
  });

  it("tries the track again on the next pass and forgets it was undecodable once found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    let decodable = false;
    const answer = answersBy(files, { drums: LOUD_DRUMS });
    const analyser = new FakeMusicAnalyser((blob) => {
      if (!decodable) throw new MusicUndecodableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass } = passOver(store, analyser);
    pass.start();
    await pass.settled();
    expect(pass.state.undecodable).toEqual(new Set(["drums"]));

    decodable = true;
    pass.listenFor("drums");
    await pass.settled();

    expect(pass.state.found.get("drums")).toEqual(LOUD_DRUMS);
    expect(pass.state.undecodable).toEqual(new Set());
  });
});

describe("MusicAnalysisPass with its analyser gone", () => {
  it("reports the gone analyser once, and only logs it on every later pass", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const analyser = new FakeMusicAnalyser(() => {
      throw new MusicAnalyserGoneError("the analysis worker crashed");
    });
    const { pass, logged, reported } = passOver(store, analyser);
    pass.start();
    await pass.settled();

    pass.listenFor("drums");
    await pass.settled();

    expect(analyser.calls).toBe(2);
    expect(reported).toEqual([expect.any(MusicAnalyserGoneError)]);
    expect(logged).toEqual([expect.any(MusicAnalyserGoneError)]);
  });
});
