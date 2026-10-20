import { describe, expect, it } from "vitest";
import { LoudnessMeterGoneError, MusicUnmeasurableError } from "./loudness-meter";
import { LoudnessMeasurementFailedError } from "./loudness-pass";
import { answersBy, MEASURED, passOver, QUIET, storeWith } from "./testing/loudness-pass-fixtures";
import { FakeLoudnessMeter } from "./testing/fake-loudness-meter";

describe("LoudnessPass.listenFor", () => {
  it("measures the one track asked for, not every slideshow's music", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const meter = new FakeLoudnessMeter(answersBy(files, { drums: MEASURED }));
    const { pass, logged, reported } = passOver(store, meter);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(await store.musicLoudness("ambient")).toBeUndefined();
    expect(meter.calls).toBe(1);
    expect([...logged, ...reported]).toEqual([]);
  });

  it("does not measure again a track with stored loudness", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    await store.putMusicLoudness("drums", QUIET);
    const meter = new FakeLoudnessMeter(answersBy(files, {}));
    const { pass } = passOver(store, meter);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(QUIET);
    expect(meter.calls).toBe(0);
  });

  it("takes the track asked for up next while the pass runs, ahead of the music queued", async () => {
    const { store, files } = await storeWith({
      "show-1": "asked",
      "show-2": "queued",
      "show-3": "first",
    });
    const order: string[] = [];
    const answer = answersBy(files, { first: MEASURED, queued: MEASURED, asked: QUIET });
    const meter = new FakeLoudnessMeter((blob) => {
      order.push([...files].find(([, file]) => file === blob)?.[0] ?? "unknown");
      return answer(blob);
    });
    const { pass } = passOver(store, meter);
    const held = meter.holdNext();

    pass.start();
    await held.started;
    pass.listenFor("asked");
    held.release();
    await pass.settled();

    expect(order).toEqual(["first", "asked", "queued"]);
    expect(await store.musicLoudness("asked")).toEqual(QUIET);
  });
});

describe("LoudnessPass with music it cannot measure", () => {
  it("marks the track undecodable, logs it, stores nothing and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: MEASURED });
    const meter = new FakeLoudnessMeter((blob) => {
      if (blob === files.get("broken")) throw new MusicUnmeasurableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(await store.musicLoudness("drums")).toEqual(MEASURED);
    expect(pass.state.undecodable).toEqual(new Set(["broken"]));
    expect(await store.musicLoudness("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(LoudnessMeasurementFailedError)]);
    expect(reported).toEqual([]);
  });

  it("does not take a measurement that failed otherwise for undecodable music", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const meter = new FakeLoudnessMeter(() => {
      throw new Error("the worker could not finish");
    });
    const { pass, logged } = passOver(store, meter);

    pass.start();
    await pass.settled();

    expect(logged).toEqual([expect.any(LoudnessMeasurementFailedError)]);
    expect(pass.state.undecodable).toEqual(new Set());
  });

  it("tries the track again on the next pass and forgets it was undecodable once found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    let measurable = false;
    const answer = answersBy(files, { drums: MEASURED });
    const meter = new FakeLoudnessMeter((blob) => {
      if (!measurable) throw new MusicUnmeasurableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass } = passOver(store, meter);
    pass.start();
    await pass.settled();
    expect(pass.state.undecodable).toEqual(new Set(["drums"]));

    measurable = true;
    pass.listenFor("drums");
    await pass.settled();

    expect(pass.state.found.get("drums")).toEqual(MEASURED);
    expect(pass.state.undecodable).toEqual(new Set());
  });
});

describe("LoudnessPass with its meter gone", () => {
  it("reports the gone meter once, and only logs it on every later pass", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const meter = new FakeLoudnessMeter(() => {
      throw new LoudnessMeterGoneError("the loudness worker crashed");
    });
    const { pass, logged, reported } = passOver(store, meter);
    pass.start();
    await pass.settled();

    pass.listenFor("drums");
    await pass.settled();

    expect(meter.calls).toBe(2);
    expect(reported).toEqual([expect.any(LoudnessMeterGoneError)]);
    expect(logged).toEqual([expect.any(LoudnessMeterGoneError)]);
  });
});
