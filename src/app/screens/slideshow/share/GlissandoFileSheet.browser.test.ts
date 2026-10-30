import { tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ExportOutcome } from "../../../glissando-file/export-job";
import type { ExportMenuState } from "../../../glissando-file/export-menu";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import GlissandoFileSheet from "./GlissandoFileSheet.svelte";

const SUBJECT = {
  title: "Sommer am See",
  pictureCount: 3,
  durationSeconds: 60,
  hasMusic: true,
};

let destroy = () => {};
afterEach(() => destroy());

function mountSheet(exportState: ExportMenuState, save: () => Promise<ExportOutcome>) {
  const calls = { back: 0, close: 0 };
  const mounted = mountWithTranslator(GlissandoFileSheet, {
    subject: SUBJECT,
    exportState,
    onSave: save,
    onBack: () => (calls.back += 1),
    onClose: () => (calls.close += 1),
  });
  destroy = mounted.destroy;
  const dialog = () => mounted.target.querySelector("dialog");
  const button = (label: string) =>
    [...(dialog()?.querySelectorAll("button") ?? [])].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
  return { calls, dialog, button };
}

const IDLE: ExportMenuState = { kind: "idle", sizeBytes: 30_000_000 };

describe("The Glissando file sheet", () => {
  it("explains the file and names it with its facts and size", () => {
    const { dialog } = mountSheet(IDLE, () => Promise.resolve("saved"));

    const text = dialog()?.textContent ?? "";
    expect(dialog()?.querySelector("h2")?.textContent).toBe("Glissando-Datei");
    expect(text).toContain("3 Bilder · Musik · Einstellungen");
    expect(text).toContain("30");
    expect(dialog()?.querySelector(".file b")?.textContent).toMatch(/\.glissando$/);
  });

  it("starts the export on Datei sichern and ends on the saved note with Fertig", async () => {
    let calls = 0;
    const {
      dialog,
      button,
      calls: nav,
    } = mountSheet(IDLE, () => {
      calls += 1;
      return Promise.resolve("saved");
    });

    button("Datei sichern")?.click();
    await tick();
    await tick();

    expect(calls).toBe(1);
    expect(dialog()?.textContent).toContain("In Downloads gesichert.");
    button("Fertig")?.click();
    expect(nav.close).toBe(1);
  });

  it("offers Erneut versuchen after a failure, which starts it again", async () => {
    const outcomes: ExportOutcome[] = ["failed", "saved"];
    const { dialog, button } = mountSheet(IDLE, () =>
      Promise.resolve(outcomes.shift() ?? "failed"),
    );

    button("Datei sichern")?.click();
    await tick();
    await tick();
    expect(dialog()?.textContent).toContain("Die Datei konnte nicht gesichert werden.");

    button("Erneut versuchen")?.click();
    await tick();
    await tick();
    expect(dialog()?.textContent).toContain("In Downloads gesichert.");
  });

  it("shows the progress and the background note while it runs", () => {
    const { dialog, button } = mountSheet({ kind: "this", fraction: 0.42 }, () =>
      Promise.resolve("saved"),
    );

    const bar = dialog()?.querySelector("[role=progressbar]");
    expect(bar?.getAttribute("aria-valuenow")).toBe("42");
    expect(dialog()?.textContent).toContain("im Hintergrund");
    expect(button("Datei sichern")).toBeUndefined();
  });

  it("disables saving while another export runs, saying why", () => {
    const { dialog, button } = mountSheet({ kind: "other" }, () => Promise.resolve("saved"));

    expect(button("Datei sichern")?.disabled).toBe(true);
    expect(dialog()?.textContent).toContain("Erst wenn der laufende Export fertig ist");
  });
});
