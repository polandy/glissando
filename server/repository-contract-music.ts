import { expect, it } from "vitest";
import type { MusicBeats } from "../src/beats/music-beats";
import type { LibraryRepository } from "./library-repository";
import {
  withMusic,
  slideshow,
  music,
  loudnessOf,
  expectSameLoudness,
} from "./repository-contract-fixtures";

/** Music, its beats and loudness, and which music is referenced. */
export function describeMusicContract(createRepository: () => LibraryRepository): void {
  it("keeps music's bytes and content type", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    expect(repository.findMusic("music-a")).toEqual(music("music-a", 1000));
    expect(repository.findMusic("music-b")).toBeUndefined();
  });

  it("deletes music and keeps the rest", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.insertMusic(music("music-b", 1000));
    repository.deleteMusic("music-a");
    expect(repository.findMusic("music-b")).toBeDefined();
    expect(repository.findMusic("music-a")).toBeUndefined();
  });

  it("finds no beats for music no device has listened to yet", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    expect(repository.findMusicBeats("music-a")).toBeUndefined();
  });

  it("finds the beats put for a music", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    const beats: MusicBeats = { kind: "beats", beatsMs: [0, 500, 1000], beatsPerMinute: 120 };
    repository.putMusicBeats("music-a", beats);
    expect(repository.findMusicBeats("music-a")).toEqual(beats);
  });

  it("replaces a music's beats on a later put", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.putMusicBeats("music-a", {
      kind: "beats",
      beatsMs: [0, 500],
      beatsPerMinute: 120,
    });
    repository.putMusicBeats("music-a", { kind: "none" });
    expect(repository.findMusicBeats("music-a")).toEqual({ kind: "none" });
  });

  it("deletes a music's beats with the music", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.putMusicBeats("music-a", { kind: "none" });
    repository.deleteMusic("music-a");
    expect(repository.findMusicBeats("music-a")).toBeUndefined();
  });

  it("finds no loudness for music not measured yet", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    expect(repository.findMusicLoudness("music-a")).toBeUndefined();
  });

  it("finds the loudness put for a music", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    const loudness = loudnessOf([0.01, 0.02], [0.5, 0.6, 0.7, 0.8, 0.9]);
    repository.putMusicLoudness("music-a", loudness);
    expectSameLoudness(repository.findMusicLoudness("music-a"), loudness);
  });

  it("replaces a music's loudness on a later put", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.putMusicLoudness("music-a", loudnessOf([0.01], [0.1, 0.2, 0.3, 0.4]));
    const relevelled = loudnessOf([0.02], [0.2, 0.3, 0.4, 0.5]);
    repository.putMusicLoudness("music-a", relevelled);
    expectSameLoudness(repository.findMusicLoudness("music-a"), relevelled);
  });

  it("deletes a music's loudness with the music", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.putMusicLoudness("music-a", loudnessOf([0.01], [0.1, 0.2, 0.3, 0.4]));
    repository.deleteMusic("music-a");
    expect(repository.findMusicLoudness("music-a")).toBeUndefined();
  });

  it("knows music is referenced while a slideshow's document names it", () => {
    const repository = createRepository();
    repository.insertMusic(music("music-a", 1000));
    repository.insertMusic(music("music-b", 1000));
    repository.insertSlideshow({ ...slideshow("show-a", 1000), document: withMusic("music-a") });
    expect(repository.isMusicReferenced("music-a")).toBe(true);
    expect(repository.isMusicReferenced("music-b")).toBe(false);
    repository.deleteSlideshow("show-a");
    expect(repository.isMusicReferenced("music-a")).toBe(false);
  });

  it("names unreferenced music uploaded before a time", () => {
    const repository = createRepository();
    repository.insertMusic(music("referenced-old", 1000));
    repository.insertMusic(music("unreferenced-old", 1000));
    repository.insertMusic(music("unreferenced-new", 5000));
    repository.insertSlideshow({
      ...slideshow("show-a", 1000),
      document: withMusic("referenced-old"),
    });
    expect(repository.unreferencedMusicUploadedBefore(5000)).toEqual(["unreferenced-old"]);
  });

  it("names music whose grace period restarted only once it is idle again before a time", () => {
    const repository = createRepository();
    repository.insertMusic(music("released", 1000));
    repository.restartMusicGrace("released", 5000);
    expect(repository.unreferencedMusicUploadedBefore(5000)).toEqual([]);
    expect(repository.unreferencedMusicUploadedBefore(5001)).toEqual(["released"]);
  });
}
