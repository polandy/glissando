import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  STATE,
  mountSheet,
  unmountSheet,
  radios,
  QUALITY_GROUP,
  radioTexts,
  groupTitles,
  FRAME_SET_UP,
  frameSection,
  frameSwitch,
} from "./testing/settings-sheet-harness";

afterEach(() => unmountSheet());

describe("SettingsSheet with the server library", () => {
  it("offers the picture frame section only with the server library on", () => {
    const off = mountSheet(STATE, { serverOn: false });
    expect(radios(off.dialog, "Sprache")).toHaveLength(3);
    expect(frameSection(off.dialog)).toBeNull();
    unmountSheet();

    const on = mountSheet(STATE, { serverOn: true });
    expect(frameSection(on.dialog)?.textContent).toContain(FRAME_SET_UP);
  });

  it("opens the frame's set-up screen from the picture frame section", () => {
    const { dialog, frameSetUps } = mountSheet(STATE, { serverOn: true });

    [...(frameSection(dialog)?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.includes(FRAME_SET_UP))
      ?.click();

    expect(frameSetUps()).toBe(1);
  });

  it("says the card is shown above the slideshows while its switch is on", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, frameCardShown: true });

    expect(frameSwitch(dialog).checked).toBe(true);
    expect(frameSection(dialog)?.textContent).toContain("Steht über deinen Diashows");
  });

  it("says the card is hidden in this browser while its switch is off", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, frameCardShown: false });

    expect(frameSwitch(dialog).checked).toBe(false);
    expect(frameSection(dialog)?.textContent).toContain("In diesem Browser ausgeblendet");
  });

  it("tells the choice when the card's switch is flipped", () => {
    const { dialog, chosen } = mountSheet(STATE, { serverOn: true, frameCardShown: false });

    frameSwitch(dialog).click();
    flushSync();

    expect(chosen.frameCardShown).toEqual([true]);
  });

  it("offers the quality of server slideshows only with the server library on", () => {
    const off = mountSheet(STATE, { serverOn: false });
    expect(radios(off.dialog, "Sprache")).toHaveLength(3);
    expect(radios(off.dialog, QUALITY_GROUP)).toEqual([]);
    unmountSheet();

    const on = mountSheet(STATE, { serverOn: true });
    expect(radios(on.dialog, QUALITY_GROUP)).toHaveLength(3);
  });

  it("names the quality Automatic picks for this screen and why", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, screenShortEdge: 1280 });

    expect(radioTexts(radios(dialog, QUALITY_GROUP))).toEqual([
      "Automatisch Zurzeit Standard · dieser Bildschirm hat 1280 Pixel an der kurzen Kante",
      "Standard 1440 px · Startet sofort, scharf auf Handy und Laptop",
      "Groß 4K · Scharf auf großen Bildschirmen; lädt vor dem Start Bilder vor",
    ]);
    expect(radios(dialog, QUALITY_GROUP)[0]?.getAttribute("aria-checked")).toBe("true");
  });

  it("picks 4K automatically on a screen sharper than the preview", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, screenShortEdge: 2160 });

    expect(radioTexts(radios(dialog, QUALITY_GROUP))[0]).toBe(
      "Automatisch Zurzeit Groß · dieser Bildschirm hat 2160 Pixel an der kurzen Kante",
    );
  });

  it("tells the chosen quality", () => {
    const { dialog, chosen } = mountSheet(STATE, { serverOn: true });

    radios(dialog, QUALITY_GROUP)[2]?.click();
    flushSync();

    expect(chosen.qualities).toEqual(["4k"]);
  });

  it("shows the Immich group only with the server library on", () => {
    const off = mountSheet(STATE, { serverOn: false });
    expect(groupTitles(off.dialog)).toEqual(
      expect.arrayContaining(["Erscheinungsbild", "Sprache", "Version"]),
    );
    expect(groupTitles(off.dialog)).not.toContain("Immich");
    unmountSheet();

    const on = mountSheet(STATE, { serverOn: true });
    expect(groupTitles(on.dialog)).toContain("Immich");
  });

  it("links the self-hosting guide with and without the server library", () => {
    for (const serverOn of [false, true]) {
      const { dialog } = mountSheet(STATE, { serverOn });
      const link = [...dialog.querySelectorAll("a")].find(
        (candidate) => candidate.textContent?.trim() === "Selbst hosten und Immich",
      );
      expect(link?.getAttribute("href")).toBe(
        "https://github.com/polandy/glissando/blob/main/docs/self-hosting.md",
      );
      unmountSheet();
    }
  });
});
