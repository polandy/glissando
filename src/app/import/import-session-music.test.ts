import { describe, expect, it } from "vitest";
import { UnconvertibleMusicError } from "../../import/music-conversion";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { ascii, concat, m4a, ogg } from "../../import/testing/music-headers";
import { chosenMusic } from "./import-session";
import {
  MUSIC_MS,
  choicesOf,
  sessionWith,
  withTwoPictures,
} from "./testing/import-session-fixtures";

const appleLossless = (): File =>
  new File([m4a("alac")], "Evening Walk.m4a", { type: "audio/mp4" });
const flacCopy = (): File => new File(["flac copy"], "Evening Walk.flac", { type: "audio/flac" });

/** A conversion the test drives: reports progress, then finishes or fails on cue. */
function heldConversion() {
  let report: (fraction: number) => void = () => undefined;
  let finish: (file: File) => void = () => undefined;
  let fail: (error: unknown) => void = () => undefined;
  let signal: AbortSignal | undefined;
  let markStarted: () => void = () => undefined;
  const started = new Promise<void>((resolve) => (markStarted = resolve));
  return {
    started,
    convertMusic: (_file: File, onProgress: (fraction: number) => void, abort: AbortSignal) => {
      report = onProgress;
      signal = abort;
      markStarted();
      return new Promise<File>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
    },
    report: (fraction: number) => report(fraction),
    finish: (file: File) => finish(file),
    fail: (error: unknown) => fail(error),
    aborted: () => signal?.aborted,
  };
}

describe("ImportSession, music a target browser cannot play", () => {
  it("shows a format every browser plays as chosen at once, unconverted", async () => {
    const { session } = await withTwoPictures();
    const mp3 = new File([concat(ascii("ID3"), new Uint8Array(20))], "Sommer.mp3");

    await session.chooseMusic(mp3);

    expect(choicesOf(session).music).toEqual({
      kind: "chosen",
      file: mp3,
      pickedName: "Sommer.mp3",
      durationMs: MUSIC_MS,
      convertedFrom: null,
    });
  });

  it("shows the conversion's progress while it converts", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);

    const chosen = session.chooseMusic(appleLossless());
    await conversion.started;
    conversion.report(0.42);

    expect(choicesOf(session).music).toEqual({
      kind: "converting",
      pickedName: "Evening Walk.m4a",
      source: "alac",
      progress: 0.42,
    });
    conversion.finish(flacCopy());
    await chosen;
  });

  it("chooses the FLAC copy of converted music and stores it with the slideshow", async () => {
    const copy = flacCopy();
    const { session, store } = await withTwoPictures({ convertMusic: () => Promise.resolve(copy) });

    await session.chooseMusic(appleLossless());
    const created = await session.create("de");

    expect(choicesOf(session).music).toEqual({
      kind: "chosen",
      file: copy,
      pickedName: "Evening Walk.m4a",
      durationMs: MUSIC_MS,
      convertedFrom: "alac",
    });
    expect(created.songs[0]).toMatchObject({
      fileName: "Evening Walk.flac",
      mimeType: "audio/flac",
    });
    expect(await (await store.musicBlob(created.songs[0]?.id ?? "")).text()).toBe("flac copy");
  });

  it("marks music it cannot convert as unusable and logs why", async () => {
    const failure = new UnconvertibleMusicError("Evening Walk.m4a");
    const { session, logged } = sessionWith(new MemoryLibraryStore(), {
      convertMusic: () => Promise.reject(failure),
    });

    await session.chooseMusic(appleLossless());

    expect(logged).toEqual([failure]);

    expect(choicesOf(session).music).toEqual({
      kind: "unusable",
      pickedName: "Evening Walk.m4a",
      reason: "unreadable",
    });
  });

  it("marks music the browser cannot read as unusable instead of keeping the previous choice", async () => {
    const { session } = await withTwoPictures();
    await session.chooseMusic(new File(["tune"], "Sommer.mp3"));

    await session.chooseMusic(new File(["x"], "Concert.broken"));

    expect(choicesOf(session).music).toEqual({
      kind: "unusable",
      pickedName: "Concert.broken",
      reason: "unreadable",
    });
    expect((await session.create("de")).songs[0]).toBeUndefined();
  });

  it("marks copy-protected music as unusable without trying to convert it", async () => {
    const { session } = sessionWith(new MemoryLibraryStore(), {
      convertMusic: () => Promise.reject(new Error("must not convert protected music")),
    });

    await session.chooseMusic(new File([m4a("drms")], "Song.m4p"));

    expect(choicesOf(session).music).toEqual({
      kind: "unusable",
      pickedName: "Song.m4p",
      reason: "protected",
    });
  });

  it("cancels the conversion when the music is removed", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);
    const chosen = session.chooseMusic(appleLossless());
    await conversion.started;

    session.removeMusic();
    conversion.fail(new DOMException("cancelled", "AbortError"));
    await chosen;

    expect(conversion.aborted()).toBe(true);
    expect(choicesOf(session).music).toBeNull();
  });

  it("keeps a later pick when an earlier conversion finishes after it", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);
    const first = session.chooseMusic(appleLossless());
    await conversion.started;

    await session.chooseMusic(new File([ogg(ascii("OpusHead"))], "Later.opus"));
    conversion.finish(flacCopy());
    await first;

    expect(chosenMusic(choicesOf(session))?.pickedName).toBe("Later.opus");
  });

  it("refuses to create while the music is still converting", async () => {
    const conversion = heldConversion();
    const { session } = await withTwoPictures(conversion);
    void session.chooseMusic(appleLossless());
    await conversion.started;

    await expect(session.create("de")).rejects.toThrow(/still converting/);
  });
});
