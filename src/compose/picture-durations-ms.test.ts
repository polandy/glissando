import { describe, expect, it } from "vitest";
import { pictureDurationsMs } from "./picture-durations-ms";
import type { StoredPicture } from "../library/stored-slideshow";

function portrait(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 300,
    height: 400,
    ...overrides,
  };
}

function landscape(id: string): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", fileName: `${id}.jpg`, width: 400, height: 300 };
}

describe("pictureDurationsMs", () => {
  it("gives every picture its own slide's duration without pairing", () => {
    const durations = pictureDurationsMs([landscape("a"), landscape("b")], undefined, undefined, 5);

    expect(durations).toEqual([5000, 5000]);
  });

  it("gives both pictures of a composed pair the pair's shared duration", () => {
    const durations = pictureDurationsMs([portrait("a"), portrait("b")], undefined, undefined, 5);

    expect(durations).toEqual([7500, 7500]);
  });

  it("gives a single picture next to a pair its own share", () => {
    const durations = pictureDurationsMs(
      [landscape("a"), portrait("b"), portrait("c")],
      undefined,
      undefined,
      5,
    );

    expect(durations).toEqual([5000, 7500, 7500]);
  });
});
