import { describe, expect, it } from "vitest";
import { InvalidOwnMusicError, SEQUENCE_BETWEEN_SONGS, type BetweenSongs } from "./own-music";
import { addSongs, moveSong, removeSong, setBetweenSongs } from "./slideshow-edits-songs";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

function song(id: string, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs: 60_000, mimeType: "audio/mpeg", ...own };
}

function slideshow(...songs: readonly StoredMusic[]): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: [
      {
        id: "a",
        capturedAt: "2025-07-01T10:00:00Z",
        width: 1,
        height: 1,
        fileName: "a.jpg",
        colours: { veil: "#404040", accent: "#C0C0C0" },
      },
    ],
    songs,
    secondsPerPicture: 5,
  };
}

const ids = (edited: StoredSlideshow): string[] => edited.songs.map(({ id }) => id);

describe("addSongs", () => {
  it("appends the songs to the playlist in the order given", () => {
    expect(ids(addSongs(slideshow(song("a")), [song("b"), song("c")]))).toEqual(["a", "b", "c"]);
  });

  it("gives a slideshow without music its first song", () => {
    expect(addSongs(slideshow(), [song("a")]).songs).toEqual([song("a")]);
  });

  it("refuses a song the playlist already has, naming it", () => {
    expect(() => addSongs(slideshow(song("a")), [song("a")])).toThrow(
      'slideshow "show" already has song "a"',
    );
  });

  it("refuses a song whose own fields are invalid, so no invalid record is stored", () => {
    expect(() => addSongs(slideshow(), [song("a", { fadeInMs: 1200 })])).toThrow(
      InvalidOwnMusicError,
    );
  });

  it("refuses a song whose own volume is out of range, so no invalid record is stored", () => {
    expect(() => addSongs(slideshow(), [song("a", { volumeDb: 7 })])).toThrow(InvalidOwnMusicError);
  });

  it("keeps a sample track's id when adding the song", () => {
    expect(addSongs(slideshow(), [song("a", { sampleTrack: "calm-piano" })]).songs).toEqual([
      song("a", { sampleTrack: "calm-piano" }),
    ]);
  });

  it("refuses a song whose sample track id is invalid, so no invalid record is stored", () => {
    expect(() => addSongs(slideshow(), [song("a", { sampleTrack: "Calm Piano" })])).toThrow(
      InvalidOwnMusicError,
    );
  });
});

describe("removeSong", () => {
  it("removes the song and keeps the others in their order, with their own settings", () => {
    const own = song("c", { fadeOutMs: 5000 });

    expect(removeSong(slideshow(song("a"), song("b"), own), "b").songs).toEqual([song("a"), own]);
  });

  it("leaves a slideshow without music after its last song", () => {
    expect(removeSong(slideshow(song("a")), "a").songs).toEqual([]);
  });

  it("refuses a song the slideshow does not play, naming it", () => {
    expect(() => removeSong(slideshow(song("a")), "gone")).toThrow(
      'slideshow "show" has no song "gone"',
    );
  });
});

describe("moveSong", () => {
  const playlist = slideshow(
    song("a"),
    song("b", { trim: { startMs: 0, endMs: 30_000 } }),
    song("c"),
  );

  it.each([
    ["to the front", "c", 0, ["c", "a", "b"]],
    ["to the end", "a", 2, ["b", "c", "a"]],
    ["one place on", "a", 1, ["b", "a", "c"]],
    ["to where it is", "b", 1, ["a", "b", "c"]],
  ])("moves a song %s, its own settings with it", (_, songId, toIndex, order) => {
    const moved = moveSong(playlist, songId, toIndex);

    expect(ids(moved)).toEqual(order);
    expect(moved.songs.find(({ id }) => id === "b")?.trim).toEqual({ startMs: 0, endMs: 30_000 });
  });

  it.each([-1, 3, 0.5])("refuses the place %s outside the playlist, naming it", (toIndex) => {
    expect(() => moveSong(playlist, "a", toIndex)).toThrow(RangeError);
    expect(() => moveSong(playlist, "a", toIndex)).toThrow(`${toIndex}`);
  });

  it("refuses a song the slideshow does not play", () => {
    expect(() => moveSong(playlist, "gone", 0)).toThrow('has no song "gone"');
  });
});

describe("setBetweenSongs", () => {
  it("plays the songs one after another with sequence", () => {
    expect(setBetweenSongs(slideshow(), SEQUENCE_BETWEEN_SONGS).betweenSongs).toBe("sequence");
  });

  it("without a choice crossfades again: the field is gone", () => {
    const sequence = setBetweenSongs(slideshow(), SEQUENCE_BETWEEN_SONGS);

    const crossfading = setBetweenSongs(sequence, undefined);

    expect(crossfading.id).toBe("show");
    expect(crossfading).not.toHaveProperty("betweenSongs");
  });

  it("refuses a value that is not a choice, naming the field", () => {
    const unknownChoice = "shuffle" as BetweenSongs;

    expect(() => setBetweenSongs(slideshow(), unknownChoice)).toThrow("betweenSongs");
  });
});
