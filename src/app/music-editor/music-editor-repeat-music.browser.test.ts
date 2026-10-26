import { afterEach, describe, expect, it } from "vitest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import { mountEditor, slideshowOfSongs, song, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

const switchInput = (): HTMLInputElement => {
  const found = document.querySelector<HTMLInputElement>('input[role="switch"]');
  if (found === null) throw new Error("no repeat switch");
  return found;
};

describe("MusicEditorScreen, repeating a fitted music (ADR-0047)", () => {
  it("keeps the repeat switch enabled once the pictures are fitted to a shorter music", () => {
    // A 6 s song with 5 pictures shrunk to end with it (ADR-0047's "fitted" note): the music
    // already outlasts nothing, yet repeating is still an equally valid choice to offer.
    mountEditor(
      slideshowOfSongs([song("a", 24_000)], {
        count: 5,
        pictureLength: OWN_SECONDS_PICTURE_LENGTH,
        secondsPerPicture: 6,
      }),
    );

    expect(switchInput().disabled).toBe(false);
    expect(document.body.textContent).not.toContain("Nicht nötig");
  });
});
