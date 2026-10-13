import { describe, expect, it } from "vitest";
import { FrameAlbumDeck } from "./frame-album-deck";
import { ROUND_SIZE } from "./frame-deck";

function picture(id: string, takenAt = "2025-01-01T00:00:00Z") {
  return { id, takenAt, size: null };
}

const NO_RANDOM = (): number => 0;

describe("FrameAlbumDeck", () => {
  it("deals rounds from the pictures it was built with", () => {
    const pictures = [picture("a"), picture("b")];
    const deck = new FrameAlbumDeck(pictures, {
      order: "oldestFirst",
      random: NO_RANDOM,
      refresh: () => Promise.resolve(pictures),
      onRefreshFailed: () => undefined,
    });

    const round = deck.nextRound();

    expect(round.pictureIds).toEqual(["a", "b"]);
    expect(round.picturesById.get("a")).toEqual(picture("a"));
  });

  it("answers an empty round, not a throw, for an empty album", () => {
    const deck = new FrameAlbumDeck([], {
      order: "oldestFirst",
      random: NO_RANDOM,
      refresh: () => Promise.resolve([]),
      onRefreshFailed: () => undefined,
    });

    expect(deck.nextRound().pictureIds).toEqual([]);
  });

  it("re-reads the album once a full pass has been dealt, and deals from it next", async () => {
    const pictures = [picture("a"), picture("b")];
    let refreshed = false;
    const deck = new FrameAlbumDeck(pictures, {
      order: "oldestFirst",
      random: NO_RANDOM,
      refresh: () => {
        refreshed = true;
        return Promise.resolve([picture("a"), picture("b"), picture("c")]);
      },
      onRefreshFailed: () => undefined,
    });
    // A round already covers the whole two-picture album, so this pass is complete.
    deck.nextRound();

    expect(refreshed).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    const round = deck.nextRound();
    expect(round.picturesById.get("c")).toEqual(picture("c"));
  });

  it("keeps dealing from what it has while a pass is not yet complete", () => {
    const many = Array.from({ length: ROUND_SIZE + 5 }, (_, index) => picture(`p${index}`));
    let refreshCalls = 0;
    const deck = new FrameAlbumDeck(many, {
      order: "oldestFirst",
      random: NO_RANDOM,
      refresh: () => {
        refreshCalls += 1;
        return Promise.resolve(many);
      },
      onRefreshFailed: () => undefined,
    });

    deck.nextRound();

    expect(refreshCalls).toBe(0);
  });

  it("reports a failed refresh instead of throwing, and keeps playing what it has", async () => {
    const pictures = [picture("a"), picture("b")];
    const failures: unknown[] = [];
    const deck = new FrameAlbumDeck(pictures, {
      order: "oldestFirst",
      random: NO_RANDOM,
      refresh: () => Promise.reject(new Error("offline")),
      onRefreshFailed: (error) => failures.push(error),
    });

    deck.nextRound();
    await Promise.resolve();
    await Promise.resolve();

    expect(failures).toHaveLength(1);
    expect(deck.nextRound().pictureIds).toEqual(["a", "b"]);
  });
});
