import { describe, expect, it } from "vitest";
import { cacheNameFor, cachesToDelete, versionsAfterActivating } from "./app-caches";

describe("cacheNameFor", () => {
  it("names one cache per version", () => {
    expect(cacheNameFor("abc123")).toBe("glissando-app-abc123");
  });
});

describe("versionsAfterActivating", () => {
  it.each([
    { rule: "the first version is the only one", seen: [], current: "v1", kept: ["v1"] },
    {
      rule: "a new version keeps the previous one",
      seen: ["v1"],
      current: "v2",
      kept: ["v1", "v2"],
    },
    {
      rule: "a third version drops the oldest",
      seen: ["v1", "v2"],
      current: "v3",
      kept: ["v2", "v3"],
    },
    {
      rule: "activating the current version again changes nothing",
      seen: ["v1", "v2"],
      current: "v2",
      kept: ["v1", "v2"],
    },
    {
      rule: "returning to an older version makes it the newest",
      seen: ["v1", "v2"],
      current: "v1",
      kept: ["v2", "v1"],
    },
  ])("$rule", ({ seen, current, kept }) => {
    expect(versionsAfterActivating(seen, current)).toEqual(kept);
  });
});

describe("cachesToDelete", () => {
  it("deletes every app cache except the kept versions", () => {
    const names = ["glissando-app-v1", "glissando-app-v2", "glissando-app-v3"];
    expect(cachesToDelete(names, ["v2", "v3"])).toEqual(["glissando-app-v1"]);
  });

  it("leaves caches that are not the app's alone", () => {
    expect(cachesToDelete(["glissando-versions", "someone-else"], ["v1"])).toEqual([]);
  });
});
