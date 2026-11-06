import { describe, expect, it } from "vitest";
import { PlaylistMusic } from "./playlist-music";
import type { MusicTrack } from "./slideshow";
import { FakeMusicTracks } from "./testing/fakes";

function track(src: string, atMs: number, endMs: number): MusicTrack {
  return { atMs, src, startMs: 0, endMs, fadeInMs: 0, fadeOutMs: 0, gain: 1 };
}

/** Heard from 0 to 10 s of the show, at its own position (0 s of the file at show time 0). */
const FIRST = track("first.mp3", 0, 10_000);
/** Heard from 5 s to 15 s of the show, so both sound from 5 s to 10 s. */
const SECOND = track("second.mp3", 5000, 15_000);

function setUp(...tracks: MusicTrack[]) {
  const opened = new FakeMusicTracks();
  const music = new PlaylistMusic(tracks, opened.open);
  return { music, of: (src: string) => opened.of(src) };
}

describe("PlaylistMusic resync", () => {
  it.each([
    ["ahead", 3.1],
    ["behind", 2.9],
    ["exactly 150 ms ahead", 3.15],
    ["exactly 150 ms behind", 2.85],
  ])("leaves a sounding track alone while it is %s within the tolerance", async (_, at) => {
    const { music, of } = setUp(FIRST);
    await music.play(0);
    of("first.mp3").playingAt = at;

    await music.follow(3000);

    expect(of("first.mp3").volume).toBe(1);
    expect(of("first.mp3").calls).toEqual(["play@0"]);
  });

  it.each([
    ["behind", 2.849],
    ["ahead", 3.151],
  ])("seeks a sounding track more than %s the tolerance back to its place", async (_, at) => {
    const { music, of } = setUp(FIRST);
    await music.play(0);
    of("first.mp3").playingAt = at;

    await music.follow(3000);

    expect(of("first.mp3").calls).toEqual(["play@0", "seek@3"]);
  });

  it("does not seek while the music does not really play", async () => {
    const { music, of } = setUp(FIRST);
    await music.play(0);
    of("first.mp3").playingAt = null;

    await music.follow(3000);

    expect(of("first.mp3").volume).toBe(1);
    expect(of("first.mp3").calls).toEqual(["play@0"]);
  });

  it("never seeks a primed track that is not heard yet", async () => {
    const { music, of } = setUp(FIRST, SECOND);
    await music.play(0);
    of("second.mp3").playingAt = 99;

    await music.follow(3000);

    expect(of("second.mp3").calls).toEqual(["play@0", "pause"]);
  });

  it("does not seek after a pause", async () => {
    const { music, of } = setUp(FIRST);
    await music.play(0);
    music.pause();
    of("first.mp3").playingAt = 9;

    await music.follow(3000);

    expect(of("first.mp3").calls).toEqual(["play@0", "pause", "play@3"]);
  });

  it("judges each track of a crossfade on its own", async () => {
    const { music, of } = setUp(FIRST, SECOND);
    await music.play(6000);
    of("first.mp3").playingAt = 7;
    of("second.mp3").playingAt = 5;

    await music.follow(7000);

    expect(of("first.mp3").calls).toEqual(["play@6"]);
    expect(of("second.mp3").calls).toEqual(["play@1", "seek@2"]);
  });
});
