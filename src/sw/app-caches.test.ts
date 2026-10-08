import { describe, expect, it } from "vitest";
import {
  cacheNameFor,
  cachesToDelete,
  cachesToSearch,
  versionsAfterActivating,
  versionsCacheFor,
} from "./app-caches";

const SCOPE = "https://example.org/app/";
const OTHER_SCOPE = "https://example.org/app/other/";

describe("cacheNameFor", () => {
  it("names one cache per version", () => {
    expect(cacheNameFor(SCOPE, "v1")).not.toBe(cacheNameFor(SCOPE, "v2"));
  });

  it("keeps installs below different paths of one host apart", () => {
    expect(cacheNameFor(SCOPE, "v1")).not.toBe(cacheNameFor(OTHER_SCOPE, "v1"));
    expect(versionsCacheFor(SCOPE)).not.toBe(versionsCacheFor(OTHER_SCOPE));
  });

  it("gives no scope a name that starts like another scope's caches", () => {
    const longer = "https://example.org/app/-v1/";
    expect(cacheNameFor(longer, "x").startsWith(cacheNameFor(SCOPE, ""))).toBe(false);
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
  it("deletes every app cache of its scope except the kept versions", () => {
    const names = ["v1", "v2", "v3"].map((version) => cacheNameFor(SCOPE, version));
    expect(cachesToDelete(names, SCOPE, ["v2", "v3"])).toEqual([cacheNameFor(SCOPE, "v1")]);
  });

  it("leaves another install's caches on the same host alone", () => {
    const names = [cacheNameFor(OTHER_SCOPE, "v1"), versionsCacheFor(OTHER_SCOPE)];
    expect(cachesToDelete(names, SCOPE, ["v2"])).toEqual([]);
  });

  it("leaves its versions record and caches that are not the app's alone", () => {
    expect(cachesToDelete([versionsCacheFor(SCOPE), "someone-else"], SCOPE, ["v1"])).toEqual([]);
  });
});

describe("cachesToSearch", () => {
  it("searches the current version first, though the previous one's cache is older", () => {
    const names = [cacheNameFor(SCOPE, "old"), cacheNameFor(SCOPE, "new")];
    expect(cachesToSearch(names, SCOPE, "new")).toEqual([
      cacheNameFor(SCOPE, "new"),
      cacheNameFor(SCOPE, "old"),
    ]);
  });

  it("searches neither the versions record nor another install's caches", () => {
    const names = [
      versionsCacheFor(SCOPE),
      cacheNameFor(OTHER_SCOPE, "new"),
      cacheNameFor(SCOPE, "new"),
      "someone-else",
    ];
    expect(cachesToSearch(names, SCOPE, "new")).toEqual([cacheNameFor(SCOPE, "new")]);
  });
});
