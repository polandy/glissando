import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { PreparingView } from "./prepare/prepare-flow";
import PreparePictures from "./PreparePictures.svelte";

let destroy = () => {};
afterEach(() => destroy());

const PREPARING: PreparingView = {
  stage: "preparing",
  quality: "4k",
  ready: 3,
  target: 7,
  pictureCount: 30,
  secondsPerPicture: 6,
  secondsPerSlide: 5,
  secondsLeft: 24,
};

function mountScreen(view: PreparingView) {
  const asked: string[] = [];
  const mounted = mountWithTranslator(PreparePictures, {
    title: "Sommer am See",
    view,
    onStartNow: () => asked.push("start"),
    onPlayInPreview: () => asked.push("preview"),
    onClose: () => asked.push("close"),
  });
  destroy = mounted.destroy;
  const text = (selector: string) =>
    mounted.target.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim();
  return { target: mounted.target, asked, text };
}

function button(target: HTMLElement, name: string): HTMLButtonElement | undefined {
  return [...target.querySelectorAll("button")].find(
    (candidate) => (candidate.getAttribute("aria-label") ?? candidate.textContent?.trim()) === name,
  );
}

describe("PreparePictures", () => {
  it("checks the connection on the first pictures while measuring", () => {
    const { text } = mountScreen({ stage: "measuring", quality: "4k", measured: 1, measuring: 2 });

    expect(text("h2")).toBe("Prüfe die Verbindung …");
    expect(text(".line")).toBe("Prüft, wie schnell 2 Bilder in 4K laden.");
    expect(text(".nums")).toBe("Messung 1 von 2");
  });

  it("shows how many pictures are prepared of how many, and when it starts", () => {
    const { target, text } = mountScreen(PREPARING);
    const bar = target.querySelector('[role="progressbar"]');

    expect(text("h2")).toBe("Bereite Bilder vor");
    expect(text(".line")).toBe(
      "4K · ein Bild braucht hier ~6 s, gezeigt wird es 5 s. Damit die Diashow ohne Anhalten läuft, lädt Glissando 7 von 30 Bildern vor.",
    );
    expect(bar?.getAttribute("aria-label")).toBe("Vorbereitete Bilder");
    expect(bar?.getAttribute("aria-valuemax")).toBe("7");
    expect(bar?.getAttribute("aria-valuenow")).toBe("3");
    expect(text(".nums")).toBe("3 von 7 Bildern startet in ~0:24");
  });

  it("marks one square per picture: the ready ones and those to prepare before playing", () => {
    const { target } = mountScreen(PREPARING);

    expect(target.querySelectorAll(".squares i")).toHaveLength(30);
    expect(target.querySelectorAll(".squares i.ready")).toHaveLength(3);
    expect(target.querySelectorAll(".squares i.needed")).toHaveLength(7);
  });

  it("caps the squares of a long slideshow", () => {
    const { target } = mountScreen({ ...PREPARING, pictureCount: 300 });

    expect(target.querySelectorAll(".squares i")).toHaveLength(40);
  });

  it("starts now, plays in 1440 or closes when asked", () => {
    const { target, asked } = mountScreen(PREPARING);

    button(target, "Jetzt starten")?.click();
    button(target, "Früher abspielen, etwas weniger scharf")?.click();
    button(target, "Schließen (Esc)")?.click();
    flushSync();

    expect(asked).toEqual(["start", "preview", "close"]);
  });

  it("offers 1440 only while preparing 4K", () => {
    const { target } = mountScreen({ ...PREPARING, quality: "1440" });

    expect(button(target, "Jetzt starten")).toBeDefined();
    expect(button(target, "Früher abspielen, etwas weniger scharf")).toBeUndefined();
  });
});
