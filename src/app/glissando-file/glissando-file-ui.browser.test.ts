import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import BlockingOverlay from "../components/BlockingOverlay.svelte";
import MoreMenu from "../screens/slideshow/MoreMenu.svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import ExportIndicator from "./ExportIndicator.svelte";
import OpenNoticeView from "./OpenNotice.svelte";
import type { OpenNotice } from "./open-flow";

let destroy = () => {};
afterEach(() => destroy());

function byText(target: HTMLElement, text: string): HTMLButtonElement {
  const found = [...target.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(text),
  );
  if (found === undefined) {
    throw new Error(`no button with "${text}"`);
  }
  return found;
}

describe("ExportIndicator", () => {
  it("names the slideshow and the percentage and draws the progress line", () => {
    const mounted = mountWithTranslator(ExportIndicator, {
      progress: { slideshowId: "s", title: "Herbst in Wien", fraction: 0.342 },
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector('[role="status"]')?.textContent).toContain(
      "Exportiere „Herbst in Wien“ … 34 %",
    );
    expect(mounted.target.querySelector<HTMLElement>(".line")?.style.width).toBe("34.2%");
  });
});

describe("BlockingOverlay", () => {
  it("with progress shows the bar, the note and Cancel", () => {
    let cancels = 0;
    const mounted = mountWithTranslator(BlockingOverlay, {
      title: "Diashow wird geöffnet …",
      detail: "Bild 12 von 48",
      progress: 0.25,
      note: "Herbst in Wien.glissando",
      onCancel: () => cancels++,
    });
    destroy = mounted.destroy;

    byText(mounted.target, "Abbrechen").click();

    expect(
      mounted.target.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    ).toBe("25");
    expect(mounted.target.textContent).toContain("Herbst in Wien.glissando");
    expect(cancels).toBe(1);
  });

  it("without progress spins and offers no Cancel", () => {
    const mounted = mountWithTranslator(BlockingOverlay, {
      title: "Diashow wird erzeugt …",
      detail: "…",
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector(".spinner")).not.toBeNull();
    expect(mounted.target.querySelector("button")).toBeNull();
  });
});

describe("MoreMenu", () => {
  function openMenu(exportState: Parameters<typeof mountMenu>[0]) {
    const calls: string[] = [];
    const mounted = mountMenu(exportState, calls);
    destroy = mounted.destroy;
    mounted.target.querySelector<HTMLButtonElement>('button[aria-label="Mehr"]')?.click();
    flushSync();
    return { target: mounted.target, calls };
  }

  function mountMenu(
    exportState:
      | { kind: "idle"; sizeBytes: number | null }
      | { kind: "this"; fraction: number }
      | { kind: "other" },
    calls: string[],
  ) {
    return mountWithTranslator(MoreMenu, {
      exportState,
      onExport: () => calls.push("export"),
      onOpened: () => calls.push("opened"),
      onDelete: () => calls.push("delete"),
    });
  }

  it("offers Export with the file's size above deleting", () => {
    const { target, calls } = openMenu({ kind: "idle", sizeBytes: 184_000_000 });

    const items = [...target.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      "Exportieren Eine .glissando-Datei, ca. 184 MB",
      "Diashow löschen …",
    ]);
    expect(target.querySelector('[role="menu"] hr')).not.toBeNull();
    byText(target, "Exportieren").click();
    expect(calls).toEqual(["opened", "export"]);
  });

  it("while this slideshow exports, shows the percentage and does nothing on a click", () => {
    const { target, calls } = openMenu({ kind: "this", fraction: 0.34 });

    const item = byText(target, "Wird exportiert");
    item.click();

    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.textContent).toContain("Wird exportiert … 34 %");
    expect(calls).toEqual(["opened"]);
  });

  it("while another slideshow exports, says Export waits for it", () => {
    const { target } = openMenu({ kind: "other" });

    const item = byText(target, "Exportieren");
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.textContent).toContain("Erst wenn der laufende Export fertig ist");
  });
});

describe("OpenNotice", () => {
  function mountNotice(notice: OpenNotice, { canCreate = true } = {}) {
    const calls: string[] = [];
    const mounted = mountWithTranslator(OpenNoticeView, {
      notice,
      onPick: () => calls.push("pick"),
      onCreate: canCreate ? () => calls.push("create") : undefined,
      onReload: () => calls.push("reload"),
      onDismiss: () => calls.push("dismiss"),
    });
    destroy = mounted.destroy;
    return { target: mounted.target, calls };
  }

  it("calls a foreign file no slideshow and offers another file or a new slideshow", () => {
    const { target, calls } = mountNotice({
      origin: "library",
      fileName: "urlaub.zip",
      problem: { kind: "foreign" },
    });

    byText(target, "Andere Datei wählen").click();
    byText(target, "Neue Diashow").click();
    target.querySelector<HTMLButtonElement>('button[aria-label="Ausblenden"]')?.click();

    expect(target.querySelector('[role="alert"]')?.textContent).toContain(
      "„urlaub.zip“ ist keine Glissando-Diashow.",
    );
    expect(calls).toEqual(["pick", "create", "dismiss"]);
  });

  it("offers no new slideshow for a foreign file on the picture step, already in one", () => {
    const { target } = mountNotice(
      {
        origin: "pictures",
        fileName: "a.zip",
        problem: { kind: "foreign" },
      },
      { canCreate: false },
    );

    expect(byText(target, "Andere Datei wählen")).toBeDefined();
    const buttons = [...target.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(buttons).not.toContain("Neue Diashow");
  });

  it("offers a reload for a file from a newer version", () => {
    const { target, calls } = mountNotice({
      origin: "library",
      fileName: "h.glissando",
      problem: { kind: "newer" },
    });

    byText(target, "App neu laden").click();

    expect(target.textContent).toContain(
      "„h.glissando“ stammt aus einer neueren Glissando-Version.",
    );
    expect(calls).toEqual(["reload"]);
  });

  it("names both sizes when the file does not fit", () => {
    const { target } = mountNotice({
      origin: "library",
      fileName: "f.glissando",
      problem: { kind: "tooLarge", neededBytes: 2_100_000_000, freeBytes: 640_000_000 },
    });

    expect(target.textContent).toContain(
      "„f.glissando“ braucht 2,1 GB, auf diesem Gerät sind noch 640 MB frei.",
    );
  });

  it("calls a damaged file damaged", () => {
    const { target } = mountNotice({
      origin: "library",
      fileName: "g.glissando",
      problem: { kind: "damaged" },
    });

    expect(target.textContent).toContain("„g.glissando“ ist beschädigt.");
  });
});
