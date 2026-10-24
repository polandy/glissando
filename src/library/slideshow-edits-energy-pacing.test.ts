import { describe, expect, it } from "vitest";
import { setSlideshowEnergyPacing } from "./slideshow-edits";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function slideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: [picture("a")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("setSlideshowEnergyPacing", () => {
  it("turns energy pacing on", () => {
    expect(setSlideshowEnergyPacing(slideshow(), true).energyPacing).toBe(true);
  });

  it("turns it back off by dropping the field", () => {
    const on = slideshow({ energyPacing: true });

    expect(setSlideshowEnergyPacing(on, false)).not.toHaveProperty("energyPacing");
  });

  it("leaves the rest of the slideshow untouched", () => {
    const stored = slideshow({ secondsPerPicture: 8, transition: "dissolve" });

    const edited = setSlideshowEnergyPacing(stored, true);

    expect(edited.secondsPerPicture).toBe(8);
    expect(edited.transition).toBe("dissolve");
  });
});
