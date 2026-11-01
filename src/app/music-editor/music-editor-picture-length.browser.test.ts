import { afterEach, describe, expect, it } from "vitest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { mountEditor, slideshowWith, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

const LISTENING = { kind: "listening" } as const;
const ownSeconds = (): StoredSlideshow => ({
  ...slideshowWith(),
  pictureLength: OWN_SECONDS_PICTURE_LENGTH,
});

const section = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('[aria-labelledby="music-picture-length"]');
  if (found === null) throw new Error("no picture length section");
  return found;
};
const radio = (name: string): HTMLButtonElement => {
  const found = [...section().querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    (button) => button.textContent?.trim() === name,
  );
  if (found === undefined) throw new Error(`no radio "${name}"`);
  return found;
};
const checked = () => section().querySelector('[aria-checked="true"]')?.textContent?.trim();
const button = (label: string): HTMLButtonElement => {
  const found = section().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (found === null) throw new Error(`no button "${label}"`);
  return found;
};
const note = () => document.querySelector(".length-notice")?.textContent ?? "";

describe("MusicEditorScreen, the picture length", () => {
  it("shows the pictures' own seconds with a stepper, and notes the music fading out with them", () => {
    mountEditor(ownSeconds(), LISTENING);

    expect(checked()).toBe("Je etwa 5 s");
    expect(section().querySelector(".stepper")).not.toBeNull();
    expect(note()).toContain("Diashow");
    expect(document.body.textContent).toContain("Bis dahin bleibt jedes Bild genau 5 s");
  });

  it("stores a picture length one half second longer", () => {
    const { calls } = mountEditor(ownSeconds(), LISTENING);

    button("Länger").click();

    expect(calls.secondsPerPicture).toEqual([5.5]);
  });

  it("lets the pictures fill the music, then hides the stepper", () => {
    const { calls, set } = mountEditor(ownSeconds(), LISTENING);

    radio("Musik füllen").click();
    set({ slideshow: slideshowWith() });

    expect(calls.pictureLength).toEqual([undefined]);
    expect(checked()).toBe("Musik füllen");
    expect(section().querySelector(".stepper")).toBeNull();
  });

  it("lets the pictures that fill the music last their own seconds again", () => {
    const { calls } = mountEditor(slideshowWith(), LISTENING);

    radio("Je etwa 5 s").click();

    expect(calls.pictureLength).toEqual([OWN_SECONDS_PICTURE_LENGTH]);
  });
});
