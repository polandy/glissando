import { describe, expect, it } from "vitest";
import { IMPORTS, MEDIA_KEYED_STORES, SLIDESHOWS, type StoreName } from "./indexeddb-schema";

const ALL_STORES: readonly StoreName[] = [
  "slideshows",
  "pictures",
  "music",
  "imports",
  "focus",
  "beats",
  "videos",
  "loudness",
];

describe("MEDIA_KEYED_STORES", () => {
  it("holds every store except slideshows and imports, each once", () => {
    const expected = ALL_STORES.filter((name) => name !== SLIDESHOWS && name !== IMPORTS);
    expect([...MEDIA_KEYED_STORES].sort()).toEqual([...expected].sort());
  });
});
