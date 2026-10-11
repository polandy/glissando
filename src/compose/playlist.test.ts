import { describe, expect, it } from "vitest";
import { NO_BEATS, type MusicBeats } from "../beats";
import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import type { StoredMusic, StoredSlideshow } from "../library/stored-slideshow";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import { filledMusicMs, playlistBeatsMs, playlistMs, resolvePlaylist } from "./playlist";

const LONG_SLIDESHOW_MS = 3_600_000;

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

type Playlist = Pick<StoredSlideshow, "songs" | "betweenSongs">;

function crossfading(...songs: StoredMusic[]): Playlist {
  return { songs };
}

function inSequence(...songs: StoredMusic[]): Playlist {
  return { songs, betweenSongs: SEQUENCE_BETWEEN_SONGS };
}

function placed(playlist: Playlist, slideshowMs = LONG_SLIDESHOW_MS) {
  return resolvePlaylist(playlist, slideshowMs).map(({ song: { id }, ...timing }) => ({
    id,
    ...timing,
  }));
}

describe("resolvePlaylist with a crossfade between songs (ADR-0023)", () => {
  it("starts the next song 3 s before the end of the previous, both fading over 3 s", () => {
    expect(placed(crossfading(song("a", 60_000), song("b", 60_000)))).toEqual([
      { id: "a", atMs: 0, startMs: 0, endMs: 60_000, fadeInMs: 0, fadeOutMs: 3000 },
      { id: "b", atMs: 57_000, startMs: 0, endMs: 60_000, fadeInMs: 3000, fadeOutMs: 0 },
    ]);
  });

  it("overlaps the songs by the outgoing song's own fade-out", () => {
    const [, next] = placed(crossfading(song("a", 60_000, { fadeOutMs: 5000 }), song("b", 60_000)));

    expect(next).toMatchObject({ atMs: 55_000, fadeInMs: 3000 });
  });

  it("cuts hard to the next song after an own fade-out of off, which still fades in", () => {
    const [previous, next] = placed(
      crossfading(song("a", 60_000, { fadeOutMs: 0 }), song("b", 60_000)),
    );

    expect(previous).toMatchObject({ endMs: 60_000, fadeOutMs: 0 });
    expect(next).toMatchObject({ atMs: 60_000, fadeInMs: 3000 });
  });

  it("keeps the incoming song's own fade-in", () => {
    const [, next] = placed(crossfading(song("a", 60_000), song("b", 60_000, { fadeInMs: 5000 })));

    expect(next).toMatchObject({ atMs: 57_000, fadeInMs: 5000 });
  });

  it("fades the first song in and the last out as for one song: only where it is cut", () => {
    const first = song("a", 60_000, { trim: { startMs: 10_000, endMs: 60_000 } });
    const last = song("b", 60_000, { trim: { startMs: 0, endMs: 40_000 } });

    const [opening, closing] = placed(crossfading(first, last));

    expect(opening).toMatchObject({ atMs: 0, fadeInMs: 2000, fadeOutMs: 3000 });
    expect(closing).toMatchObject({ atMs: 47_000, endMs: 40_000, fadeOutMs: 2000 });
  });

  it("scales a short song's fades down in proportion and never sounds three songs at once", () => {
    const short = song("b", 60_000, { trim: { startMs: 0, endMs: 5000 } });

    const [, middle, last] = placed(crossfading(song("a", 60_000), short, song("c", 60_000)));

    expect(middle).toMatchObject({ atMs: 57_000, endMs: 5000, fadeInMs: 2500, fadeOutMs: 2500 });
    expect(last).toMatchObject({ atMs: 60_000 });
  });
});

describe("resolvePlaylist one song after another (ADR-0023)", () => {
  it("starts each song at the previous one's end, fading only where a song is cut", () => {
    const cut = song("b", 60_000, { trim: { startMs: 10_000, endMs: 40_000 } });

    expect(placed(inSequence(song("a", 60_000), cut))).toEqual([
      { id: "a", atMs: 0, startMs: 0, endMs: 60_000, fadeInMs: 0, fadeOutMs: 0 },
      { id: "b", atMs: 60_000, startMs: 10_000, endMs: 40_000, fadeInMs: 2000, fadeOutMs: 2000 },
    ]);
  });
});

describe("resolvePlaylist where the slideshow ends (ADR-0009, ADR-0023)", () => {
  it("leaves out the songs the slideshow never reaches and fades out the one it ends in", () => {
    expect(placed(crossfading(song("a", 60_000), song("b", 60_000)), 50_000)).toEqual([
      { id: "a", atMs: 0, startMs: 0, endMs: 50_000, fadeInMs: 0, fadeOutMs: 2000 },
    ]);
  });

  it("ends both songs of a crossfade the slideshow ends in, their fades scaled to what is heard", () => {
    expect(placed(crossfading(song("a", 60_000), song("b", 60_000)), 58_000)).toEqual([
      { id: "a", atMs: 0, startMs: 0, endMs: 58_000, fadeInMs: 0, fadeOutMs: 2000 },
      { id: "b", atMs: 57_000, startMs: 0, endMs: 1000, fadeInMs: 600, fadeOutMs: 400 },
    ]);
  });

  it("keeps an own fade-out where the slideshow ends the song", () => {
    const [only] = placed(crossfading(song("a", 60_000, { fadeOutMs: 5000 })), 30_000);

    expect(only).toMatchObject({ endMs: 30_000, fadeOutMs: 5000 });
  });

  it("has no tracks without songs", () => {
    expect(resolvePlaylist({ songs: [] }, 10_000)).toEqual([]);
  });
});

describe("playlistMs", () => {
  it("is the excerpts' sum less the crossfades' overlaps", () => {
    const trimmed = song("b", 60_000, { trim: { startMs: 0, endMs: 30_000 } });

    expect(playlistMs(crossfading(song("a", 60_000), trimmed, song("c", 20_000)))).toBe(104_000);
  });

  it("is the excerpts' sum one after another", () => {
    expect(playlistMs(inSequence(song("a", 60_000), song("b", 20_000)))).toBe(80_000);
  });

  it("is absent without songs", () => {
    expect(playlistMs({ songs: [] })).toBeUndefined();
  });
});

describe("filledMusicMs", () => {
  const playlist = crossfading(song("a", 60_000), song("b", 20_000));

  it("is the playlist's length when the pictures fill the music", () => {
    expect(filledMusicMs(playlist)).toBe(77_000);
  });

  it("is absent when the pictures last their own seconds with music", () => {
    expect(
      filledMusicMs({ ...playlist, pictureLength: OWN_SECONDS_PICTURE_LENGTH }),
    ).toBeUndefined();
  });

  it("is absent without songs", () => {
    expect(filledMusicMs({ songs: [] })).toBeUndefined();
  });
});

describe("playlistBeatsMs (ADR-0023)", () => {
  const everySecond: MusicBeats = {
    kind: "beats",
    beatsMs: Array.from({ length: 20 }, (_, index) => index * 1000),
    beatsPerMinute: 60,
  };
  const offBeat: MusicBeats = {
    kind: "beats",
    beatsMs: Array.from({ length: 20 }, (_, index) => index * 1000 + 500),
    beatsPerMinute: 60,
  };
  const beats = new Map([
    ["a", everySecond],
    ["b", offBeat],
  ]);

  it("places each song's beats at its start, inside an overlap only the incoming song's", () => {
    const beatsMs = playlistBeatsMs(crossfading(song("a", 20_000), song("b", 20_000)), beats);

    const before = Array.from({ length: 16 }, (_, index) => (index + 1) * 1000);
    const after = Array.from({ length: 20 }, (_, index) => 17_500 + index * 1000);
    expect(beatsMs).toEqual([...before, ...after]);
  });

  it("takes no beats from a song whose pictures change evenly, not even inside its overlap", () => {
    const even = song("b", 20_000, { pictureChanges: "even" });

    const beatsMs = playlistBeatsMs(crossfading(song("a", 20_000), even), beats);

    expect(beatsMs).toEqual(Array.from({ length: 16 }, (_, index) => (index + 1) * 1000));
  });

  it("takes no beats from a song not listened to yet", () => {
    const beatsMs = playlistBeatsMs(
      inSequence(song("a", 20_000), song("new", 20_000)),
      new Map([["a", everySecond]]),
    );

    expect(beatsMs).toEqual(Array.from({ length: 19 }, (_, index) => (index + 1) * 1000));
  });

  it("has no beats when no song has one to change on", () => {
    const playlist = crossfading(song("a", 20_000, { pictureChanges: "even" }), song("c", 20_000));

    expect(playlistBeatsMs(playlist, new Map([["c", NO_BEATS]]))).toBeUndefined();
  });
});
