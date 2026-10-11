import { describe, expect, it } from "vitest";
import { UnconvertibleMusicError } from "../../import/music-conversion";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { ascii, concat, m4a, ogg } from "../../import/testing/music-headers";
import { chosenSongs } from "./import-session";
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

describe("ImportSession, songs a target browser cannot play", () => {
  it("shows a format every browser plays as chosen at once, unconverted", async () => {
    const { session } = await withTwoPictures();
    const mp3 = new File([concat(ascii("ID3"), new Uint8Array(20))], "Sommer.mp3");

    await session.addSongs([mp3]);

    expect(choicesOf(session).songs).toEqual([
      {
        key: 1,
        kind: "chosen",
        file: mp3,
        pickedName: "Sommer.mp3",
        durationMs: MUSIC_MS,
        convertedFrom: null,
      },
    ]);
  });

  it("shows the conversion's progress while it converts", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);

    const chosen = session.addSongs([appleLossless()]);
    await conversion.started;
    conversion.report(0.42);

    expect(choicesOf(session).songs).toEqual([
      {
        key: 1,
        kind: "converting",
        pickedName: "Evening Walk.m4a",
        source: "alac",
        progress: 0.42,
      },
    ]);
    conversion.finish(flacCopy());
    await chosen;
  });

  it("chooses the FLAC copy of converted music and stores it with the slideshow", async () => {
    const copy = flacCopy();
    const { session, store } = await withTwoPictures({ convertMusic: () => Promise.resolve(copy) });

    await session.addSongs([appleLossless()]);
    const created = await session.create("de");

    expect(chosenSongs(choicesOf(session))).toEqual([
      {
        key: 1,
        kind: "chosen",
        file: copy,
        pickedName: "Evening Walk.m4a",
        durationMs: MUSIC_MS,
        convertedFrom: "alac",
      },
    ]);
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

    await session.addSongs([appleLossless()]);

    expect(logged).toEqual([failure]);
    expect(choicesOf(session).songs).toEqual([
      { key: 1, kind: "unusable", pickedName: "Evening Walk.m4a", reason: "unreadable" },
    ]);
  });

  it("marks a song the browser cannot read as unusable and creates the slideshow without it", async () => {
    const { session } = await withTwoPictures();

    await session.addSongs([
      new File(["tune"], "Sommer.mp3", { type: "audio/mpeg" }),
      new File(["x"], "Concert.broken"),
    ]);

    expect(choicesOf(session).songs[1]).toEqual({
      key: 2,
      kind: "unusable",
      pickedName: "Concert.broken",
      reason: "unreadable",
    });
    const created = await session.create("de");
    expect(created.songs.map((song) => song.fileName)).toEqual(["Sommer.mp3"]);
  });

  it("marks copy-protected music as unusable without trying to convert it", async () => {
    const { session } = sessionWith(new MemoryLibraryStore(), {
      convertMusic: () => Promise.reject(new Error("must not convert protected music")),
    });

    await session.addSongs([new File([m4a("drms")], "Song.m4p")]);

    expect(choicesOf(session).songs).toEqual([
      { key: 1, kind: "unusable", pickedName: "Song.m4p", reason: "protected" },
    ]);
  });

  it("cancels a song's conversion when it is removed and reads the songs after it", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);
    const added = session.addSongs([
      appleLossless(),
      new File([ogg(ascii("OpusHead"))], "Later.opus"),
    ]);
    await conversion.started;

    session.removeSong(1);
    conversion.fail(new DOMException("cancelled", "AbortError"));
    await added;

    expect(conversion.aborted()).toBe(true);
    expect(chosenSongs(choicesOf(session)).map((song) => song.pickedName)).toEqual(["Later.opus"]);
    expect(choicesOf(session).songs).toHaveLength(1);
  });

  it("cancels every conversion under way when the import is discarded", async () => {
    const conversion = heldConversion();
    const { session } = sessionWith(new MemoryLibraryStore(), conversion);
    const added = session.addSongs([appleLossless()]);
    await conversion.started;

    await session.discard();
    conversion.fail(new DOMException("cancelled", "AbortError"));
    await added;

    expect(conversion.aborted()).toBe(true);
    expect(choicesOf(session).songs).toEqual([]);
  });

  it("refuses to create while a song is still converting", async () => {
    const conversion = heldConversion();
    const { session } = await withTwoPictures(conversion);
    void session.addSongs([appleLossless()]);
    await conversion.started;

    await expect(session.create("de")).rejects.toThrow(/still being read/);
  });
});
