import { describe, expect, it } from "vitest";
import { createFrameDeck, ROUND_SIZE, type FramePicture } from "./frame-deck";

function picture(id: string, takenAt: string): FramePicture {
  return { id, takenAt };
}

/** Returns its queued values in order, then repeats the last one; proves the deck's own calls. */
function fakeRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value as number;
  };
}

describe("createFrameDeck", () => {
  it("deals an empty round for an empty album", () => {
    const deck = createFrameDeck([], "shuffled", fakeRandom([0]));

    expect(deck.nextRound()).toEqual([]);
  });

  it("orders newest first, repeating once the album is exhausted", () => {
    const pictures = [
      picture("a", "2024-01-01T00:00:00Z"),
      picture("b", "2024-03-01T00:00:00Z"),
      picture("c", "2024-02-01T00:00:00Z"),
    ];
    const deck = createFrameDeck(pictures, "newestFirst", fakeRandom([0]));

    expect(deck.nextRound()).toEqual(["b", "c", "a"]);
    expect(deck.nextRound()).toEqual(["b", "c", "a"]);
  });

  it("orders oldest first, repeating once the album is exhausted", () => {
    const pictures = [
      picture("a", "2024-01-01T00:00:00Z"),
      picture("b", "2024-03-01T00:00:00Z"),
      picture("c", "2024-02-01T00:00:00Z"),
    ];
    const deck = createFrameDeck(pictures, "oldestFirst", fakeRandom([0]));

    expect(deck.nextRound()).toEqual(["a", "c", "b"]);
    expect(deck.nextRound()).toEqual(["a", "c", "b"]);
  });

  it("caps a round at ROUND_SIZE pictures, continuing from where it left off", () => {
    const pictures = Array.from({ length: ROUND_SIZE + 5 }, (_, index) =>
      picture(`p${String(index)}`, new Date(Date.UTC(2024, 0, 1) + index * 1000).toISOString()),
    );
    const deck = createFrameDeck(pictures, "oldestFirst", fakeRandom([0]));

    const first = deck.nextRound();
    const second = deck.nextRound();

    expect(first).toEqual(pictures.slice(0, ROUND_SIZE).map((p) => p.id));
    expect(second).toEqual([
      ...pictures.slice(ROUND_SIZE).map((p) => p.id),
      ...pictures.slice(0, ROUND_SIZE - 5).map((p) => p.id),
    ]);
  });

  it("shuffles the whole album into one round without repeating a picture", () => {
    const pictures = [
      picture("a", "2024-01-01T00:00:00Z"),
      picture("b", "2024-01-02T00:00:00Z"),
      picture("c", "2024-01-03T00:00:00Z"),
    ];
    const deck = createFrameDeck(pictures, "shuffled", fakeRandom([0.5, 0.1]));

    const round = deck.nextRound();

    expect(round).toHaveLength(3);
    expect(new Set(round)).toEqual(new Set(["a", "b", "c"]));
  });

  it("reshuffles once the deck is exhausted, never repeating the last shown picture first", () => {
    const pictures = [picture("a", "2024-01-01T00:00:00Z"), picture("b", "2024-01-02T00:00:00Z")];
    // The first shuffle (no swap) deals "a, b"; the second (one swap) would naturally
    // repeat "b" first if the deck did not guard against it.
    const deck = createFrameDeck(pictures, "shuffled", fakeRandom([0.9, 0]));

    const firstRound = deck.nextRound();
    const secondRound = deck.nextRound();

    expect(firstRound).toEqual(["a", "b"]);
    expect(firstRound.at(-1)).not.toBe(secondRound[0]);
  });
});
