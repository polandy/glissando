import { describe, expect, it } from "vitest";
import { setSlideshowTransition } from "./slideshow-edits";
import { leaveMood, setSlideshowMood } from "./slideshow-edits-mood";
import { setPictureLength, setSecondsPerPicture } from "./slideshow-edits-timing";
import { InvalidSlideshowMoodError } from "./slideshow-mood";
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

describe("setSlideshowMood", () => {
  it("sets the slideshow's mood", () => {
    const edited = setSlideshowMood(slideshow(), "calm");

    expect(edited.mood).toBe("calm");
  });

  it("with undefined removes the field: Custom again", () => {
    const moody = setSlideshowMood(slideshow(), "calm");

    const custom = setSlideshowMood(moody, undefined);

    expect(custom).not.toHaveProperty("mood");
  });

  it("leaves the single settings untouched", () => {
    const edited = setSlideshowMood(
      slideshow({ secondsPerPicture: 8, transition: "dissolve" }),
      "calm",
    );

    expect(edited.secondsPerPicture).toBe(8);
    expect(edited.transition).toBe("dissolve");
  });

  it("rejects a value that is no mood", () => {
    expect(() => setSlideshowMood(slideshow(), "sleepy" as never)).toThrow(
      InvalidSlideshowMoodError,
    );
  });
});

describe("leaveMood", () => {
  it("does nothing without a mood", () => {
    const stored = slideshow({ secondsPerPicture: 8 });

    expect(leaveMood(stored)).toEqual(stored);
  });

  it("writes the calm mood's values, whose transition is the default, and deletes the mood", () => {
    const left = leaveMood(slideshow({ mood: "calm", secondsPerPicture: 8 }));

    expect(left).not.toHaveProperty("mood");
    expect(left).not.toHaveProperty("transition");
    expect(left.pictureLength).toBe("seconds");
    expect(left.secondsPerPicture).toBe(7);
  });

  it("writes the lively mood's own transition, and deletes the mood", () => {
    const left = leaveMood(slideshow({ mood: "lively", secondsPerPicture: 8 }));

    expect(left).not.toHaveProperty("mood");
    expect(left.transition).toBe("alternate");
    expect(left.pictureLength).toBe("seconds");
    expect(left.secondsPerPicture).toBe(3);
  });

  it("never touches the pictures", () => {
    const stored = slideshow({ mood: "calm" });

    expect(leaveMood(stored).pictures).toBe(stored.pictures);
  });
});

describe("changing a single setting while a mood is on", () => {
  it("setSlideshowTransition leaves the mood first, then applies the change", () => {
    const edited = setSlideshowTransition(slideshow({ mood: "calm" }), "dissolve");

    expect(edited).not.toHaveProperty("mood");
    expect(edited.transition).toBe("dissolve");
    expect(edited.pictureLength).toBe("seconds");
    expect(edited.secondsPerPicture).toBe(7);
  });

  it("setPictureLength leaves the mood first, then applies the change", () => {
    const edited = setPictureLength(slideshow({ mood: "lively" }), undefined);

    expect(edited).not.toHaveProperty("mood");
    expect(edited).not.toHaveProperty("pictureLength");
    expect(edited.transition).toBe("alternate");
    expect(edited.secondsPerPicture).toBe(3);
  });

  it("setSecondsPerPicture leaves the mood first, then applies the change", () => {
    const edited = setSecondsPerPicture(slideshow({ mood: "calm" }), 9);

    expect(edited).not.toHaveProperty("mood");
    expect(edited.pictureLength).toBe("seconds");
    expect(edited.secondsPerPicture).toBe(9);
  });

  it("leaves nothing when no mood is on", () => {
    const stored = slideshow({ secondsPerPicture: 6 });

    expect(setSecondsPerPicture(stored, 9)).toEqual({ ...stored, secondsPerPicture: 9 });
  });
});
