import { afterEach, describe, expect, it } from "vitest";
import "../../styles/base.css";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { PlaylistSongView } from "../music-editor/playlist-view";
import type { ImportTiming } from "./music-fit";
import MusicFit from "./MusicFit.svelte";

const de = createTranslator("de");

/** Removed with ADR-0047's "fitted"/"repeats" note (replaced by `import.fitOutlasts` et al). */
const OLD_SILENT_TEXT = "Die letzten Bilder laufen still.";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

const song = (excerptMs: number): PlaylistSongView => ({
  id: "s1",
  number: 1,
  fileName: "song.mp3",
  durationMs: excerptMs,
  excerptMs,
  trimmed: false,
  atMs: 0,
  laneAtMs: 0,
  laneMs: excerptMs,
  reached: true,
  volumeBadge: { kind: "none" },
});

function mountFit(
  timing: ImportTiming,
  onRepeatMusic: (repeatMusic: true | undefined) => void = () => undefined,
  onAddSong: () => void = () => undefined,
): HTMLElement {
  const music = timing.music;
  if (music === null) throw new Error("the fixture needs a music fit");
  const mounted = mountWithTranslator(MusicFit, {
    pictureIds: ["a", "b"],
    urls: new Map(),
    segmentsMs: [10_000, 10_000],
    timing,
    music,
    songs: [song(music.seconds * 1000)],
    onRepeatMusic,
    onAddSong,
  });
  destroy = mounted.destroy;
  return mounted.target;
}

const noteText = (target: HTMLElement): string =>
  (target.querySelector(".note, .notice .text")?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("MusicFit", () => {
  it("shows a mint note with the shrunk pictures' share once they fit the music (ADR-0047)", () => {
    const target = mountFit({
      perPictureSeconds: 4.4,
      totalSeconds: 44,
      music: { kind: "fitted", seconds: 44, shareSeconds: 4.4 },
    });

    expect(target.querySelector(".notice.mint")).not.toBeNull();
    expect(noteText(target)).toBe(
      de.t("import.fitFitted", { seconds: de.formatTenthSeconds(4.4) }),
    );
    expect(target.textContent).not.toContain(OLD_SILENT_TEXT);
  });

  it("offers to repeat the music or add a song when fitting still falls short (ADR-0047)", () => {
    let repeated: true | undefined | "not called" = "not called";
    let addClicked = false;
    const target = mountFit(
      { perPictureSeconds: 5, totalSeconds: 20, music: { kind: "silent-after", seconds: 12 } },
      (value) => (repeated = value),
      () => (addClicked = true),
    );

    expect(target.querySelector(".notice.warn")).not.toBeNull();
    expect(noteText(target)).toBe(de.t("import.fitOutlasts", { time: de.formatDuration(8) }));
    expect(target.textContent).not.toContain(OLD_SILENT_TEXT);

    const buttons = [...target.querySelectorAll<HTMLButtonElement>(".notice .actions button")];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      de.t("import.repeatButton"),
      de.t("import.addSongButton"),
    ]);

    buttons[0]?.click();
    expect(repeated).toBe(true);

    buttons[1]?.click();
    expect(addClicked).toBe(true);
  });

  it("shows the music repeats, with a way back to playing it once (ADR-0047)", () => {
    let repeated: true | undefined | "not called" = "not called";
    const target = mountFit(
      { perPictureSeconds: 5, totalSeconds: 20, music: { kind: "repeats", seconds: 12 } },
      (value) => (repeated = value),
    );

    expect(noteText(target)).toBe(`${de.t("import.fitRepeats")} ${de.t("import.playOnceButton")}`);
    expect(target.textContent).not.toContain(OLD_SILENT_TEXT);

    target.querySelector<HTMLButtonElement>(".note button")?.click();
    expect(repeated).toBeUndefined();
  });
});
