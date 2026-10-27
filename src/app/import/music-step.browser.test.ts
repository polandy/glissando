import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import type { ImportSession } from "./import-session";
import MusicStep from "./MusicStep.svelte";
import { choicesOf, withTwoPictures } from "./testing/import-session-fixtures";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const song = (name: string): File => new File([name], name, { type: "audio/mpeg" });

function mountStep(session: ImportSession): HTMLElement {
  const step = mountWithTranslator(
    MusicStep,
    {
      session,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onBack: () => undefined,
      onCreate: () => undefined,
      onError: (error: unknown) => {
        throw error;
      },
      toaster: new Toaster(new FakeScheduler()),
    },
    { current: createTranslator("en") },
  );
  unmounts.push(step.destroy);
  return step.target;
}

const rows = (target: HTMLElement) =>
  [...target.querySelectorAll(".song")].map((row) => ({
    name: row.querySelector(".name b")?.textContent.trim(),
    tag: row.querySelector(".tag")?.textContent.trim(),
    unreached: row.classList.contains("unreached"),
  }));

const buttonNamed = (target: HTMLElement, name: string) => {
  const button = [...target.querySelectorAll("button")].find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name || candidate.textContent.trim() === name,
  );
  if (button === undefined) throw new Error(`no button "${name}"`);
  return button;
};

describe("MusicStep, the import's song list", () => {
  it("lists the songs in play order with where each starts, dimming one the slideshow does not reach", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([song("Low Tide.mp3"), song("Paper Lanterns.mp3")]);

    const target = mountStep(session);

    expect(rows(target)).toEqual([
      { name: "Low Tide.mp3", tag: "from 0:00", unreached: false },
      { name: "Paper Lanterns.mp3", tag: "Not reached", unreached: true },
    ]);
    expect(target.textContent).toContain(
      "The music fades out with the last picture; the dimmed songs are not reached.",
    );
  });

  it("adds every picked file as a song, below the songs already listed", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([song("Low Tide.mp3")]);
    const target = mountStep(session);
    const input = target.querySelector<HTMLInputElement>('input[type="file"]');
    const picked = new DataTransfer();
    picked.items.add(song("Paper Lanterns.mp3"));
    picked.items.add(song("Sea Glass.mp3"));

    expect(input?.multiple).toBe(true);
    expect(buttonNamed(target, "Choose files")).toBeDefined();
    if (input !== null) {
      input.files = picked.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(
      choicesOf(session)
        .songs.filter(
          (song) => song.kind !== "downloadingSample" && song.kind !== "failedSampleDownload",
        )
        .map((added) => added.pickedName),
    ).toEqual(["Low Tide.mp3", "Paper Lanterns.mp3", "Sea Glass.mp3"]);
  });

  it("removes a song by its ×", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([song("Low Tide.mp3"), song("Paper Lanterns.mp3")]);
    const target = mountStep(session);

    buttonNamed(target, "Remove Low Tide.mp3").click();
    flushSync();

    expect(rows(target).map((row) => row.name)).toEqual(["Paper Lanterns.mp3"]);
  });

  it("moves a song down by the arrow key on its grip", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([song("Low Tide.mp3"), song("Paper Lanterns.mp3")]);
    const target = mountStep(session);

    buttonNamed(target, "Move Low Tide.mp3").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    flushSync();

    expect(rows(target).map((row) => row.name)).toEqual(["Paper Lanterns.mp3", "Low Tide.mp3"]);
  });
});

describe("MusicStep, the pace a new slideshow starts on (ADR-0050)", () => {
  const paceLine = (target: HTMLElement) =>
    target.querySelector(".pace")?.textContent.replace(/\s+/g, " ").trim();

  it("names the mood Calm and its seconds per picture, with no picture-length choice", async () => {
    const { session } = await withTwoPictures();
    await session.addSongs([song("Low Tide.mp3")]);

    const target = mountStep(session);

    expect(paceLine(target)).toBe(
      "Mood Calm · about 7 s per picture, on the music's phrases. Change it in the slideshow.",
    );
    expect(target.querySelector('[role="radio"]')).toBeNull();
    expect(target.querySelector('[aria-label="Longer"]')).toBeNull();
  });

  it("centres the clock on the line's first row, also when the line wraps", async () => {
    const { session } = await withTwoPictures();
    const target = mountStep(session);
    const line = target.querySelector<HTMLElement>(".pace");
    if (line === null) throw new Error("no pace line");
    line.style.width = "160px";
    const centre = (element: Element | null) => {
      if (element === null) throw new Error("no element");
      const { top, height } = element.getBoundingClientRect();
      return top + height / 2;
    };

    expect(line.getBoundingClientRect().height).toBeGreaterThan(
      line.querySelector("b")?.getBoundingClientRect().height ?? 0,
    );
    expect(
      Math.abs(centre(line.querySelector(".icon")) - centre(line.querySelector("b"))),
    ).toBeLessThan(1);
  });

  it("without music names Calm's seconds, with no seconds stepper, and counts with them", async () => {
    const { session } = await withTwoPictures();

    const target = mountStep(session);

    expect(paceLine(target)).toBe("Mood Calm · about 7 s per picture. Change it in the slideshow.");
    expect(target.querySelector('[aria-label="Longer"]')).toBeNull();
    expect(target.querySelector(".timing")?.textContent).toContain("0:14");
  });
});
