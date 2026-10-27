import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { mountEditor, slideshowWith, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

const LISTENING = { kind: "listening" } as const;
const withoutMusic = (own: Partial<StoredSlideshow> = {}): StoredSlideshow => ({
  ...slideshowWith(),
  songs: [],
  ...own,
});

const section = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('[aria-labelledby="music-picture-length"]');
  if (found === null) throw new Error("no picture length section");
  return found;
};
const button = (name: string): HTMLButtonElement => {
  const found = [...section().querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent?.trim() === name || candidate.getAttribute("aria-label") === name,
  );
  if (found === undefined) throw new Error(`no button "${name}"`);
  return found;
};

describe("MusicEditorScreen without music, the picture length (MUSIC_EDITOR.md)", () => {
  it("shows the mood's picture times, without beats, under the empty state", () => {
    mountEditor(withoutMusic({ mood: "calm" }), LISTENING);

    expect(document.body.textContent).toContain("Noch keine Musik");
    expect(section().textContent).toContain(
      "Die Bilddauer wird durch die Stimmung Ruhig festgelegt — ~7 s",
    );
    expect(section().querySelector('[role="radio"]')).toBeNull();
  });

  it("leaves the mood when 'Set them yourself' is pressed", () => {
    const { calls } = mountEditor(withoutMusic({ mood: "calm" }), LISTENING);

    button("Selbst festlegen").click();

    expect(calls.setOwnPictureTimes).toBe(1);
  });

  it("shows only the own seconds under Custom, without 'Fill the music'", () => {
    mountEditor(withoutMusic(), LISTENING);

    expect(section().textContent).toContain("Je etwa 5 s");
    expect(section().querySelector(".stepper")).not.toBeNull();
    expect(section().querySelector('[role="radio"]')).toBeNull();
    expect(section().textContent).not.toContain("Musik füllen");
  });

  it("stores a picture length one half second longer", () => {
    const { calls } = mountEditor(withoutMusic(), LISTENING);

    button("Länger").click();

    expect(calls.secondsPerPicture).toEqual([5.5]);
  });
});
