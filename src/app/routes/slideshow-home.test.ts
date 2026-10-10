import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { findSlideshowHome, serverRouteStore } from "./slideshow-home";

const SLIDESHOW: StoredSlideshow = {
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [],
  secondsPerPicture: 5,
};

describe("where an opened slideshow is looked up", () => {
  it("finds a slideshow stored on the device there", async () => {
    const device = new MemoryLibraryStore();
    await device.saveSlideshow(SLIDESHOW);

    await expect(findSlideshowHome("show", device)).resolves.toBe("device");
  });

  it("takes a slideshow the device does not know for one on the server", async () => {
    await expect(findSlideshowHome("show", new MemoryLibraryStore())).resolves.toBe("server");
  });

  it("passes on a device failure other than an unknown slideshow", async () => {
    const failure = new Error("IndexedDB closed");
    const device = { getSlideshow: () => Promise.reject(failure) };

    await expect(findSlideshowHome("show", device)).rejects.toBe(failure);
  });
});

describe("the server store as the slideshow route uses it", () => {
  it("reads slideshows from the server store", async () => {
    const server = new MemoryLibraryStore();
    await server.saveSlideshow(SLIDESHOW);

    await expect(serverRouteStore(server).getSlideshow("show")).resolves.toEqual(SLIDESHOW);
  });

  it("spares no media: claims and their release do nothing", async () => {
    const route = serverRouteStore(new MemoryLibraryStore());

    await expect(route.claimMedia("claim", new Date(0), "picture")).resolves.toBeUndefined();
    await expect(route.releaseClaim("claim")).resolves.toBeUndefined();
  });

  it("refuses to measure a server slideshow's size, which is not known before downloading", async () => {
    await expect(serverRouteStore(new MemoryLibraryStore()).mediaBytes(SLIDESHOW)).rejects.toThrow(
      /not measured/,
    );
  });
});
