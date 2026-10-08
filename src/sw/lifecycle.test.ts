import { describe, expect, it } from "vitest";
import { cacheNameFor, versionsCacheFor } from "./app-caches";
import { forgetOldVersions, isSkipWaiting, type VersionStorePorts } from "./lifecycle";

const SCOPE = "https://example.org/app/";
const OTHER_SCOPE = "https://example.org/other/";

/** Cache storage as names in creation order plus this scope's versions record. */
function store(names: string[], record: unknown) {
  const state = { names: [...names], record };
  const ports: VersionStorePorts = {
    readRecord: () => Promise.resolve(state.record),
    writeRecord: (versions) => {
      state.record = versions;
      return Promise.resolve();
    },
    cacheNames: () => Promise.resolve([...state.names]),
    deleteCache: (name) => {
      state.names = state.names.filter((kept) => kept !== name);
      return Promise.resolve();
    },
  };
  return { state, ports };
}

describe("forgetOldVersions", () => {
  it("records the first version", async () => {
    const { state, ports } = store([cacheNameFor(SCOPE, "v1")], undefined);
    await forgetOldVersions(ports, SCOPE, "v1");
    expect(state.record).toEqual(["v1"]);
    expect(state.names).toEqual([cacheNameFor(SCOPE, "v1")]);
  });

  it("keeps the previous version and deletes the one before it", async () => {
    const names = ["v1", "v2", "v3"].map((version) => cacheNameFor(SCOPE, version));
    const { state, ports } = store([versionsCacheFor(SCOPE), ...names], ["v1", "v2"]);
    await forgetOldVersions(ports, SCOPE, "v3");
    expect(state.record).toEqual(["v2", "v3"]);
    expect(state.names).toEqual([
      versionsCacheFor(SCOPE),
      cacheNameFor(SCOPE, "v2"),
      cacheNameFor(SCOPE, "v3"),
    ]);
  });

  it("leaves another install's caches on the same host alone", async () => {
    const others = [cacheNameFor(OTHER_SCOPE, "v1"), versionsCacheFor(OTHER_SCOPE)];
    const { state, ports } = store([...others, cacheNameFor(SCOPE, "v2")], undefined);
    await forgetOldVersions(ports, SCOPE, "v2");
    expect(state.names).toEqual([...others, cacheNameFor(SCOPE, "v2")]);
  });

  it.each([
    { what: "not a list", record: { versions: ["v1"] } },
    { what: "a list holding something else", record: ["v1", 2] },
  ])("fails on a stored record that is $what and deletes nothing", async ({ record }) => {
    const names = [cacheNameFor(SCOPE, "v1"), cacheNameFor(SCOPE, "v2")];
    const { state, ports } = store(names, record);
    await expect(forgetOldVersions(ports, SCOPE, "v2")).rejects.toThrow(/versions are invalid/);
    expect(state.names).toEqual(names);
    expect(state.record).toBe(record);
  });
});

describe("isSkipWaiting", () => {
  it.each([
    { what: "the skip-waiting message", data: { type: "SKIP_WAITING" }, is: true },
    { what: "another message type", data: { type: "OTHER" }, is: false },
    { what: "a bare string", data: "SKIP_WAITING", is: false },
    { what: "nothing", data: null, is: false },
  ])("tells $what: $is", ({ data, is }) => {
    expect(isSkipWaiting(data)).toBe(is);
  });
});
