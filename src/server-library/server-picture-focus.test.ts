import { describe, expect, it } from "vitest";
import { storedFocus } from "../library/focus-pass-fixtures";
import type { StoredFocus } from "../library/picture-focus";
import { ServerLibraryNotFoundError, ServerLibraryUnavailableError } from "./server-library-client";
import { ServerPictureFocus } from "./server-picture-focus";

const SCENERY = storedFocus({ kind: "scenery" });
const NONE = storedFocus({ kind: "none" });

/** A hand-written fake of the slideshow focus HTTP endpoints, keyed by slideshow id. */
function fakeFocusClient(seed: Record<string, Record<string, StoredFocus>> = {}) {
  const slideshows = new Map(
    Object.entries(seed).map(([id, focus]) => [id, new Map(Object.entries(focus))]),
  );
  const calls: string[] = [];
  let unavailable: Error | null = null;
  let missing: Set<string> = new Set();

  return {
    calls,
    setUnavailable(error: Error | null): void {
      unavailable = error;
    },
    setMissing(slideshowIds: readonly string[]): void {
      missing = new Set(slideshowIds);
    },
    put(slideshowId: string, assetId: string, stored: StoredFocus): void {
      const focus = slideshows.get(slideshowId) ?? new Map<string, StoredFocus>();
      focus.set(assetId, stored);
      slideshows.set(slideshowId, focus);
    },
    async slideshowFocus(slideshowId: string): Promise<ReadonlyMap<string, StoredFocus>> {
      calls.push(`get ${slideshowId}`);
      if (unavailable !== null) throw unavailable;
      if (missing.has(slideshowId)) throw new ServerLibraryNotFoundError(slideshowId);
      return slideshows.get(slideshowId) ?? new Map();
    },
    async putPictureFocus(
      slideshowId: string,
      assetId: string,
      stored: StoredFocus,
    ): Promise<"stored" | "newerKept"> {
      calls.push(`put ${slideshowId}/${assetId}`);
      if (unavailable !== null) throw unavailable;
      if (missing.has(slideshowId)) throw new ServerLibraryNotFoundError(slideshowId);
      const focus = slideshows.get(slideshowId) ?? new Map<string, StoredFocus>();
      const current = focus.get(assetId);
      if (current !== undefined && current.detector >= stored.detector) return "newerKept";
      focus.set(assetId, stored);
      slideshows.set(slideshowId, focus);
      return "stored";
    },
  };
}

function harness(seed: Record<string, Record<string, StoredFocus>> = {}) {
  const client = fakeFocusClient(seed);
  const logged: unknown[] = [];
  const focus = new ServerPictureFocus({ client, log: (error) => logged.push(error) });
  return { client, logged, focus };
}

describe("ServerPictureFocus", () => {
  it("answers nothing for a picture whose slideshow was never read", async () => {
    const { focus } = harness();

    expect(await focus.pictureFocus(["asset-1"])).toEqual(new Map());
  });

  it("asks the server once per slideshow, cached across calls", async () => {
    const { focus, client } = harness({ "show-1": { "asset-1": SCENERY } });
    focus.noteSlideshow("show-1", ["asset-1", "asset-2"]);

    await focus.pictureFocus(["asset-1", "asset-2"]);
    const result = await focus.pictureFocus(["asset-1", "asset-2"]);

    expect(result).toEqual(new Map([["asset-1", SCENERY]]));
    expect(client.calls).toEqual(["get show-1"]);
  });

  it("refreshes a slideshow's cached focus when it is noted again", async () => {
    const { focus, client } = harness({ "show-1": { "asset-1": SCENERY } });
    focus.noteSlideshow("show-1", ["asset-1"]);
    await focus.pictureFocus(["asset-1"]);

    client.put("show-1", "asset-1", NONE);
    focus.noteSlideshow("show-1", ["asset-1"]);
    const result = await focus.pictureFocus(["asset-1"]);

    expect(result).toEqual(new Map([["asset-1", NONE]]));
    expect(client.calls).toEqual(["get show-1", "get show-1"]);
  });

  it("puts a focus on the server, naming the slideshow the picture was last read with", async () => {
    const { focus, client } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);

    await focus.putPictureFocus("asset-1", SCENERY);

    expect(client.calls).toEqual(["put show-1/asset-1"]);
    expect(await focus.pictureFocus(["asset-1"])).toEqual(new Map([["asset-1", SCENERY]]));
    expect(await focus.pictureFocusForPass(["asset-1"])).toEqual(new Map([["asset-1", SCENERY]]));
  });

  it("shows a focus put this session at once, before the server confirms it", async () => {
    const { focus } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);

    const putting = focus.putPictureFocus("asset-1", SCENERY);

    expect(await focus.pictureFocus(["asset-1"])).toEqual(new Map([["asset-1", SCENERY]]));
    await putting;
  });

  it("throws for a picture no slideshow was ever read for", async () => {
    const { focus } = harness();

    await expect(focus.putPictureFocus("asset-1", SCENERY)).rejects.toThrow(/asset-1/);
  });

  it("logs a focus PUT the server was unreachable for, and does not throw", async () => {
    const { focus, client, logged } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);
    const failure = new ServerLibraryUnavailableError("PUT focus");
    client.setUnavailable(failure);

    await focus.putPictureFocus("asset-1", SCENERY);

    expect(logged).toEqual([failure]);
  });

  it("logs a focus PUT naming a slideshow the server no longer has, and does not throw", async () => {
    const { focus, client, logged } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);
    client.setMissing(["show-1"]);

    await focus.putPictureFocus("asset-1", SCENERY);

    expect(logged).toEqual([new ServerLibraryNotFoundError("show-1")]);
  });

  it("keeps an unreachable PUT's result for the UI, but not for the pass: it counts as unstored", async () => {
    const { focus, client } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);
    await focus.pictureFocus(["asset-1"]); // caches the slideshow's server focus while reachable
    client.setUnavailable(new ServerLibraryUnavailableError("PUT focus"));

    await focus.putPictureFocus("asset-1", SCENERY);

    expect(await focus.pictureFocus(["asset-1"])).toEqual(new Map([["asset-1", SCENERY]]));
    expect(await focus.pictureFocusForPass(["asset-1"])).toEqual(new Map());
  });

  it("drops a focus put for a slideshow the server no longer has", async () => {
    const { focus, client } = harness();
    focus.noteSlideshow("show-1", ["asset-1"]);
    client.setMissing(["show-1"]);

    await focus.putPictureFocus("asset-1", SCENERY);

    client.setMissing([]);
    expect(await focus.pictureFocus(["asset-1"])).toEqual(new Map());
  });

  it("re-reads the slideshow's focus and drops its own when the server kept a newer one", async () => {
    const { focus, client } = harness({ "show-1": { "asset-1": storedFocus(SCENERY.focus, 5) } });
    focus.noteSlideshow("show-1", ["asset-1"]);

    await focus.putPictureFocus("asset-1", NONE);

    expect(await focus.pictureFocus(["asset-1"])).toEqual(
      new Map([["asset-1", storedFocus(SCENERY.focus, 5)]]),
    );
    expect(client.calls).toEqual(["put show-1/asset-1", "get show-1"]);
  });

  it("rejects an unexpected PUT failure instead of swallowing it", async () => {
    const failure = new Error("the server refused the focus");
    const client = {
      slideshowFocus: () => Promise.resolve(new Map<string, StoredFocus>()),
      putPictureFocus: () => Promise.reject(failure),
    };
    const logged: unknown[] = [];
    const focus = new ServerPictureFocus({ client, log: (error) => logged.push(error) });
    focus.noteSlideshow("show-1", ["asset-1"]);

    await expect(focus.putPictureFocus("asset-1", SCENERY)).rejects.toBe(failure);
    expect(logged).toEqual([]);
  });
});
