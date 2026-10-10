import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import { playedPictures, pictureFailureFor } from "./server-playing";

describe("the pictures a slideshow plays", () => {
  it("leaves out the pictures Immich no longer has, keeping the order of the rest", () => {
    const stored = slideshow({ pictures: [picture("a"), picture("b"), picture("c")] });

    const played = playedPictures(stored, new Set(["b"]));

    expect(played.pictures.map(({ id }) => id)).toEqual(["a", "c"]);
  });

  it("plays every picture when none is missing", () => {
    const stored = slideshow({ pictures: [picture("a")] });

    expect(playedPictures(stored, new Set())).toBe(stored);
  });
});

describe("what playing makes of a picture that failed to load", () => {
  it.each([
    {
      case: "a server picture Immich no longer has is skipped",
      home: "server" as const,
      cause: new PictureMissingFromImmichError("a"),
      failure: { kind: "skip", pictureId: "a" },
    },
    {
      case: "any other failure of a server picture means Immich isn't answering",
      home: "server" as const,
      cause: new ImmichUnavailableError("unreachable"),
      failure: { kind: "stop", failure: "immich" },
    },
    {
      case: "a device picture is one that could not be loaded",
      home: "device" as const,
      cause: new Error("gone from storage"),
      failure: { kind: "stop", failure: "picture" },
    },
  ])("$case", ({ home, cause, failure }) => {
    expect(pictureFailureFor(home, cause)).toEqual(failure);
  });
});
