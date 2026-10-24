import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";
import { mountEditor, slideshowWith, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

/** 60 BPM: calm's 4-beat step is 4 s, closest to its 7 s target at 2 steps, i.e. 8 s = 8 beats. */
const KNOWN_60_BPM: BeatsStatus = {
  kind: "known",
  beats: { kind: "beats", beatsMs: [0, 1000, 2000, 3000], beatsPerMinute: 60 },
};

const withCalmMood = (): StoredSlideshow => ({ ...slideshowWith(), mood: "calm" });

const section = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('[aria-labelledby="music-picture-length"]');
  if (found === null) throw new Error("no picture length section");
  return found;
};
const setOwnButton = (): HTMLButtonElement => {
  const found = [...section().querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === "Selbst festlegen",
  );
  if (found === undefined) throw new Error("no 'Selbst festlegen' button");
  return found;
};

describe("MusicEditorScreen, the picture length under a mood (MOOD.md)", () => {
  it("shows the mood's picture times instead of the own-seconds choice", () => {
    mountEditor(withCalmMood(), KNOWN_60_BPM);

    expect(section().textContent).toContain(
      "Die Bilddauer wird durch die Stimmung Ruhig festgelegt — ~8 s · 8 Beats",
    );
    expect(section().querySelector('[role="radio"]')).toBeNull();
  });

  it("leaves the mood when 'Set them yourself' is pressed", () => {
    const { calls } = mountEditor(withCalmMood(), KNOWN_60_BPM);

    setOwnButton().click();

    expect(calls.setOwnPictureTimes).toBe(1);
  });

  it("still offers the own-seconds choice without a mood", () => {
    mountEditor(slideshowWith(), KNOWN_60_BPM);

    expect(section().querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect(section().textContent).not.toContain("Die Bilddauer wird durch die Stimmung");
  });
});
