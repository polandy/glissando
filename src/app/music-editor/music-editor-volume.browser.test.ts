import { afterEach, describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { LoudnessStatus } from "../loudness/music-loudness-known";
import { mountEditor, slideshowWith, text, TRACK_MS, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

/** BS.1770-4's calibration offset from mean square to LUFS (dev-docs/library/MUSIC.md). */
const LUFS_CALIBRATION_OFFSET = -0.691;
const LOUDNESS_HOP_MS = 100;

/** A track as loud as `lufs` throughout, peaking at `peakDbfs`, covering the whole track. */
function loudnessOf(lufs: number, peakDbfs: number): MusicLoudness {
  const hops = TRACK_MS / LOUDNESS_HOP_MS;
  const meanSquare = 10 ** ((lufs - LUFS_CALIBRATION_OFFSET) / 10);
  const peak = 10 ** (peakDbfs / 20);
  return {
    blockMeanSquares: Float32Array.from({ length: hops }, () => meanSquare),
    hopPeaks: Float32Array.from({ length: hops }, () => peak),
  };
}

/** 3 dB quieter than the target, with headroom to spare: levels with no cap. */
const ROOM_TO_LEVEL: LoudnessStatus = { kind: "known", loudness: loudnessOf(-17, -10) };
/** Quieter than the target, peaking close to full scale: the peak ceiling caps it 4 dB short. */
const CAPPED_SHORT: LoudnessStatus = { kind: "known", loudness: loudnessOf(-16.7, -0.4) };

const section = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('[aria-labelledby="music-volume"]');
  if (found === null) throw new Error("no volume section");
  return found;
};
const slider = (): HTMLInputElement => {
  const found = section().querySelector<HTMLInputElement>('input[type="range"]');
  if (found === null) throw new Error("no volume slider");
  return found;
};
const resetButton = (): HTMLButtonElement | null =>
  section().querySelector<HTMLButtonElement>(".btn");
const listenButton = (): HTMLButtonElement => {
  const found = section().querySelector<HTMLButtonElement>(".listen-btn");
  if (found === null) throw new Error("no listen button");
  return found;
};
const originalButton = (): HTMLButtonElement => {
  const found = section().querySelector<HTMLButtonElement>(".orig-btn");
  if (found === null) throw new Error("no original-file button");
  return found;
};

describe("MusicEditorScreen, the volume", () => {
  it("plays unlevelled and says so while the loudness is still measuring", () => {
    mountEditor(slideshowWith(), { kind: "listening" }, { kind: "listening" });

    expect(text('[aria-labelledby="music-volume"]')).toContain(
      "Spielt wie aufgenommen, bis gemessen",
    );
    expect(text('[aria-labelledby="music-volume"]')).toContain(
      "Die Lautheit wird gemessen… bis dahin spielt er wie aufgenommen.",
    );
    expect(resetButton()).toBeNull();
  });

  it("shows it levelled by the measured amount, with no reset button", () => {
    mountEditor(slideshowWith(), { kind: "listening" }, ROOM_TO_LEVEL);

    expect(text(".readout")).toContain("Gleich laut wie die anderen Songs");
    expect(text(".readout")).toContain("Gleich laut wie die anderen Songs");
    expect(text('[aria-labelledby="music-volume"]')).toContain(
      "Gleich laut wie die anderen Songs, angepasst um +3 dB.",
    );
    expect(slider().value).toBe("0");
    expect(resetButton()).toBeNull();
  });

  it("raises the own volume on the slider, offering a reset back to levelled", () => {
    const { calls, set } = mountEditor(slideshowWith(), { kind: "listening" }, ROOM_TO_LEVEL);

    slider().value = "2";
    slider().dispatchEvent(new Event("input", { bubbles: true }));

    expect(calls.volumes).toEqual([2]);
    set({ slideshow: slideshowWith({ volumeDb: 2 }) });
    expect(text(".readout")).toContain("+2 dB");
    expect(text(".sub")).toBe("Lauter als die anderen Songs");
    resetButton()?.click();
    expect(calls.volumeResets).toBe(1);
  });

  it("caps the slider short of the target when the peak ceiling would distort it", () => {
    mountEditor(slideshowWith(), { kind: "listening" }, CAPPED_SHORT);

    expect(slider().max).toBe("-4");
    expect(text('[aria-labelledby="music-volume"]')).toContain(
      "4 dB leiser als die anderen Songs, damit es sauber klingt.",
    );
    expect(section().querySelector(".cap")).not.toBeNull();
  });

  it("reports the whole way back to levelled when the slider returns to 0", () => {
    const { calls } = mountEditor(
      slideshowWith({ volumeDb: 2 }),
      { kind: "listening" },
      ROOM_TO_LEVEL,
    );

    slider().value = "0";
    slider().dispatchEvent(new Event("input", { bubbles: true }));

    expect(calls.volumes).toEqual([undefined]);
  });

  it("calls back to listen at this volume and to toggle the original file", () => {
    const { calls, set } = mountEditor(slideshowWith(), { kind: "listening" }, ROOM_TO_LEVEL);

    listenButton().click();
    expect(calls.listenVolumes).toBe(1);

    set({ listening: { kind: "volume", positionMs: 0, original: false } });
    originalButton().click();
    expect(calls.toggleOriginals).toBe(1);
  });
});

describe("MusicEditorScreen, the loudness comparison box", () => {
  it("is gone: the song list shows and nothing compares the songs' loudness", () => {
    mountEditor(slideshowWith(), { kind: "listening" }, { kind: "listening" });

    expect(document.querySelector(".songs")).not.toBeNull();
    expect(document.querySelector(".box")).toBeNull();
    expect(document.body.textContent).not.toContain("Lautstärke der Titel");
  });
});
