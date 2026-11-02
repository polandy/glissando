import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { existingSlideshowsOf } from "./existing-slideshows";

const slideshow = (title: string, capturedAt: string): StoredSlideshow =>
  ({ title, pictures: [{ capturedAt }] }) as unknown as StoredSlideshow;

const listing = (...slideshows: StoredSlideshow[]) => ({
  listSlideshows: () => Promise.resolve(slideshows),
});

const device = listing(slideshow("July 2025", "2025-07-01T10:00:00Z"));
const server = listing(slideshow("June 2025", "2025-06-01T10:00:00Z"));

describe("existingSlideshowsOf", () => {
  it("lists the device's slideshows with their capture dates for a slideshow that stays there", async () => {
    expect(await existingSlideshowsOf({ device, server }, false)).toEqual([
      { title: "July 2025", capturedAt: ["2025-07-01T10:00:00Z"] },
    ]);
  });

  it("adds the server's slideshows for one that goes to the server", async () => {
    const titles = (await existingSlideshowsOf({ device, server }, true)).map((s) => s.title);

    expect(titles).toEqual(["July 2025", "June 2025"]);
  });

  it("keeps to the device's slideshows while the server is out of reach", async () => {
    const away = {
      listSlideshows: () => Promise.reject(new ServerLibraryUnavailableError("away")),
    };

    const titles = (await existingSlideshowsOf({ device, server: away }, true)).map((s) => s.title);

    expect(titles).toEqual(["July 2025"]);
  });

  it("passes on any other failure", async () => {
    const broken = { listSlideshows: () => Promise.reject(new Error("broken")) };

    await expect(existingSlideshowsOf({ device, server: broken }, true)).rejects.toThrow("broken");
  });
});
