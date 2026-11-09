import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { openedSlideshowOf } from "./opened-slideshow";
import { serverRouteStore } from "./slideshow-home";

function harness(device: MemoryLibraryStore) {
  const events: unknown[] = [];
  const server = serverRouteStore(new MemoryLibraryStore());
  const opened = openedSlideshowOf({
    device,
    server,
    reportError: (error) => events.push(["reported", error]),
    leave: () => events.push("left"),
  });
  return { opened, events, server };
}

describe("a slideshow opened by id for its route", () => {
  it("opens one the device does not know from the server store, staying on the screen", async () => {
    const { opened, events, server } = harness(new MemoryLibraryStore());

    await expect(opened("show")).resolves.toEqual({ home: "server", store: server });
    expect(events).toEqual([]);
  });

  it("reports a failed lookup and leaves to the parent screen", async () => {
    const failure = new Error("IndexedDB closed");
    class ClosedDevice extends MemoryLibraryStore {
      override getSlideshow(): Promise<never> {
        return Promise.reject(failure);
      }
    }
    const { opened, events } = harness(new ClosedDevice());

    await expect(opened("show")).rejects.toBe(failure);
    expect(events).toEqual([["reported", failure], "left"]);
  });
});
