import { describe, expect, it } from "vitest";
import { frameDeepLinkUrl, parseFrameDeepLink } from "./frame-deep-link";

describe("parseFrameDeepLink", () => {
  it("reads the album id out of a frame hash", () => {
    expect(parseFrameDeepLink("#frame=album-1")).toBe("album-1");
  });

  it("decodes a percent-encoded album id", () => {
    expect(parseFrameDeepLink("#frame=album%20one")).toBe("album one");
  });

  it("is null for a hash that is not a frame link", () => {
    expect(parseFrameDeepLink("")).toBeNull();
    expect(parseFrameDeepLink("#")).toBeNull();
    expect(parseFrameDeepLink("#somethingElse=1")).toBeNull();
  });

  it("is null for a frame hash with no album id", () => {
    expect(parseFrameDeepLink("#frame=")).toBeNull();
  });
});

describe("frameDeepLinkUrl", () => {
  it("builds the origin, path and frame hash, percent-encoding the album id", () => {
    const url = frameDeepLinkUrl("https://glissando.home", "/", "album one");

    expect(url).toBe("https://glissando.home/#frame=album%20one");
  });

  it("round-trips through parseFrameDeepLink", () => {
    const url = frameDeepLinkUrl("https://glissando.home", "/", "album-1");
    const hash = url.slice(url.indexOf("#"));

    expect(parseFrameDeepLink(hash)).toBe("album-1");
  });
});
