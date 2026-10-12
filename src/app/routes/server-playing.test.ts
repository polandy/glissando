import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import {
  picturesAheadFor,
  playedPictures,
  pictureFailureFor,
  serverRenditionFor,
} from "./server-playing";

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

describe("how many pictures playing loads ahead of the screen", () => {
  it.each([
    ["server", 3],
    ["device", 1],
  ] as const)("loads a %s slideshow %i picture(s) ahead", (home, ahead) => {
    expect(picturesAheadFor(home)).toBe(ahead);
  });
});

describe("the rendition a server slideshow plays in", () => {
  it.each([
    ["1440", "preview a"],
    ["4k", "display of a"],
  ] as const)("plays %s from %j", async (quality, rendition) => {
    const cancel = new AbortController();
    const signals: (AbortSignal | undefined)[] = [];
    const store = {
      pictureBlob: (id: string, signal?: AbortSignal) => {
        signals.push(signal);
        return Promise.resolve(new Blob([`display of ${id}`]));
      },
      playbackPictureBlob: (id: string, signal?: AbortSignal) => {
        signals.push(signal);
        return Promise.resolve(new Blob([`preview ${id}`]));
      },
    };

    const blob = await serverRenditionFor(store, quality)("a", cancel.signal);

    expect(await blob.text()).toBe(rendition);
    expect(signals).toEqual([cancel.signal]);
  });
});
