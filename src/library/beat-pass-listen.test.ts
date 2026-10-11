import { describe, expect, it } from "vitest";
import { MusicUndecodableError } from "./beat-detector";
import { BeatDetectionFailedError } from "./beat-pass";
import { answersBy, DRUMS, NO_CLEAR_BEAT, passOver, storeWith } from "./testing/beat-pass-fixtures";
import { FakeBeatDetector } from "./testing/fake-beat-detector";

describe("BeatPass.listenFor", () => {
  it("listens to the one track asked for, not to every slideshow's music", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "ambient" });
    const detector = new FakeBeatDetector(answersBy(files, { drums: DRUMS }));
    const { pass, logged, reported } = passOver(store, detector);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(await store.musicBeats("ambient")).toBeUndefined();
    expect(detector.calls).toBe(1);
    expect([...logged, ...reported]).toEqual([]);
  });

  it("does not listen again to a track with stored beats", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    await store.putMusicBeats("drums", NO_CLEAR_BEAT);
    const detector = new FakeBeatDetector(answersBy(files, {}));
    const { pass } = passOver(store, detector);

    pass.listenFor("drums");
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(NO_CLEAR_BEAT);
    expect(detector.calls).toBe(0);
  });

  it("takes the track asked for up next while the pass runs, ahead of the music queued", async () => {
    const { store, files } = await storeWith({
      "show-1": "asked",
      "show-2": "queued",
      "show-3": "first",
    });
    const order: string[] = [];
    const answer = answersBy(files, { first: DRUMS, queued: DRUMS, asked: NO_CLEAR_BEAT });
    const detector = new FakeBeatDetector((blob) => {
      order.push([...files].find(([, file]) => file === blob)?.[0] ?? "unknown");
      return answer(blob);
    });
    const { pass } = passOver(store, detector);
    const held = detector.holdNext();

    pass.start();
    await held.started;
    pass.listenFor("asked");
    held.release();
    await pass.settled();

    expect(order).toEqual(["first", "asked", "queued"]);
    expect(await store.musicBeats("asked")).toEqual(NO_CLEAR_BEAT);
  });
});

describe("BeatPass with music it cannot decode", () => {
  it("marks the track undecodable, logs it, stores nothing and carries on", async () => {
    const { store, files } = await storeWith({ "show-1": "drums", "show-2": "broken" });
    const answer = answersBy(files, { drums: DRUMS });
    const detector = new FakeBeatDetector((blob) => {
      if (blob === files.get("broken")) throw new MusicUndecodableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass, logged, reported } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.musicBeats("drums")).toEqual(DRUMS);
    expect(pass.state.undecodable).toEqual(new Set(["broken"]));
    expect(await store.musicBeats("broken")).toBeUndefined();
    expect(logged).toEqual([expect.any(BeatDetectionFailedError)]);
    expect(reported).toEqual([]);
  });

  it("does not take a detection that failed otherwise for undecodable music", async () => {
    const { store } = await storeWith({ "show-1": "drums" });
    const detector = new FakeBeatDetector(() => {
      throw new Error("the worker could not finish");
    });
    const { pass, logged } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(logged).toEqual([expect.any(BeatDetectionFailedError)]);
    expect(pass.state.undecodable).toEqual(new Set());
  });

  it("tries the track again on the next pass and forgets it was undecodable once found", async () => {
    const { store, files } = await storeWith({ "show-1": "drums" });
    let decodable = false;
    const answer = answersBy(files, { drums: DRUMS });
    const detector = new FakeBeatDetector((blob) => {
      if (!decodable) throw new MusicUndecodableError({ cause: "no codec" });
      return answer(blob);
    });
    const { pass } = passOver(store, detector);
    pass.start();
    await pass.settled();
    expect(pass.state.undecodable).toEqual(new Set(["drums"]));

    decodable = true;
    pass.listenFor("drums");
    await pass.settled();

    expect(pass.state.found.get("drums")).toEqual(DRUMS);
    expect(pass.state.undecodable).toEqual(new Set());
  });
});
