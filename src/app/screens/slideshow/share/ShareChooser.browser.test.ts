import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ShareLink } from "../../../../server-library/server-library-client";
import { FakeScheduler } from "../../../../ui-kit/testing/fake-scheduler";
import { FakeHtmlExportPorts } from "../../../html-export/testing/fake-html-export-ports";
import { HtmlExportSession } from "../../../html-export/html-export-session";
import { ShareLinkSession } from "../../../share-link/share-link-session";
import { FakeShareLinkApi } from "../../../share-link/testing/fake-share-link-api";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import type { ExportPreview } from "../../../video-export/slideshow-video-export";
import { FakeExportPorts } from "../../../video-export/testing/fake-export-ports";
import { VideoExportSession } from "../../../video-export/video-export-session";
import { details } from "../../slideshow-screen-harness";
import type { SlideshowStorage } from "../../view-models";
import ShareFlowHost from "./testing/ShareFlowHost.svelte";

const LINK: ShareLink = { token: "q7Rk2vN8xT4mWp1Lc9Hb3A", createdAt: "2026-10-11T09:30:00.000Z" };
const SERVER: SlideshowStorage = { kind: "server", saving: false, missingCount: 0 };
const DEVICE: SlideshowStorage = { kind: "device", fromImmich: 0, fromDevice: 3 };
const THIRTY_MB = 30_000_000;

let destroy = () => {};
afterEach(() => destroy());

type ExportState =
  | { kind: "idle"; sizeBytes: number | null }
  | { kind: "this"; fraction: number }
  | { kind: "other" };

async function mountShare({
  storage = SERVER as SlideshowStorage | null,
  shared = null as ShareLink | null,
  exportState = { kind: "idle", sizeBytes: THIRTY_MB } as ExportState,
} = {}) {
  const api = new FakeShareLinkApi("show", shared);
  const session = new ShareLinkSession("show", {
    api,
    origin: "https://photos.example.org",
    scheduler: new FakeScheduler(),
    clipboard: null,
    shareSheet: null,
    openTab: () => {},
    onTurnedOff: () => {},
    onError: (error) => {
      throw error;
    },
  });
  const calls = { opened: 0, closed: 0, saved: 0 };
  const mounted = mountWithTranslator(ShareFlowHost, {
    slideshow: details(["a", "b", "c"], { title: "Sommer am See", songCount: 1 }),
    storage,
    linkSession: storage?.kind === "server" ? session : null,
    exportState,
    onExport: () => {
      calls.saved += 1;
      return Promise.resolve("saved" as const);
    },
    onOpened: () => (calls.opened += 1),
    newVideoExport: () =>
      new VideoExportSession<ExportPreview>(
        { title: "Sommer am See", durationMs: 10_000, withMusic: true, withAudio: true },
        new FakeExportPorts() as unknown as ConstructorParameters<
          typeof VideoExportSession<ExportPreview>
        >[1],
      ),
    newHtmlExport: () =>
      new HtmlExportSession(
        {
          title: "Sommer am See",
          durationMs: 10_000,
          withMusic: true,
          pictureCount: 3,
          picturesFromImmich: false,
          clipCount: 0,
        },
        new FakeHtmlExportPorts(),
      ),
    onClosed: () => (calls.closed += 1),
  });
  destroy = mounted.destroy;
  const { target } = mounted;
  const dialog = () => target.querySelector("dialog");
  const heading = () => dialog()?.querySelector("h2")?.textContent;
  const labelled = (label: string) =>
    [...(dialog()?.querySelectorAll<HTMLElement>("button") ?? [])].find(
      (button) => button.getAttribute("aria-label") === label,
    );
  const option = (title: string): HTMLElement => {
    const found = [...(dialog()?.querySelectorAll<HTMLElement>(".option") ?? [])].find(
      (candidate) => candidate.querySelector("strong")?.textContent === title,
    );
    if (found === undefined) throw new Error(`no row "${title}" in ${dialog()?.innerText}`);
    return found;
  };
  const eyebrows = () =>
    [...(dialog()?.querySelectorAll(".eyebrow") ?? [])].map((node) => node.textContent);
  const press = async (element: HTMLElement | undefined) => {
    element?.click();
    await tick();
    flushSync();
  };
  const shareButton = () => target.querySelector<HTMLButtonElement>(".share-button");
  await press(shareButton() ?? undefined);
  return { target, calls, dialog, heading, labelled, option, eyebrows, press, shareButton };
}

describe("The Share chooser", () => {
  it("names the slideshow and groups the link above the copies", async () => {
    const { dialog, heading, eyebrows, option, calls } = await mountShare();

    expect(heading()).toBe("Teilen");
    expect(dialog()?.textContent).toContain("Sommer am See · 3 Bilder · 1:00 · mit Musik");
    expect(eyebrows()).toEqual([
      "Per Link ansehen · bleibt aktuell",
      "Kopie sichern · so wie sie jetzt ist",
    ]);
    expect(option("Link teilen").textContent).toContain("Alle mit dem Link können zuschauen");
    expect(option("Video").textContent).toContain("Ein MP4 für jeden Player oder einen Messenger");
    expect(option("Webseite").textContent).toContain("auch offline");
    expect(option("Glissando-Datei").textContent).toContain(
      "Eine .glissando-Datei, Bilder aus Immich heruntergeladen",
    );
    expect(calls.opened).toBe(1);
  });

  it("shows a shared link without its scheme and the On pill", async () => {
    const { option } = await mountShare({ shared: LINK });
    await tick();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    flushSync();

    expect(option("Per Link geteilt").querySelector(".on-pill")?.textContent).toBe("An");
  });

  it("leaves the link group out when there is no server library", async () => {
    const { eyebrows, option } = await mountShare({ storage: null });

    expect(option("Video")).toBeDefined();
    expect(eyebrows()).toEqual(["Kopie sichern · so wie sie jetzt ist"]);
  });

  it("dims the link row of a device slideshow, saying how to share it", async () => {
    const { option } = await mountShare({ storage: DEVICE });

    const row = option("Link teilen");
    expect(row.tagName).toBe("DIV");
    expect(row.textContent).toContain(
      "Speichere sie auf deinem Glissando-Server, um sie per Link zu teilen.",
    );
  });

  it.each([
    {
      state: { kind: "this", fraction: 0.34 } as ExportState,
      text: "Wird gespeichert\u00a0… 34\u00a0%",
    },
    {
      state: { kind: "other" } as ExportState,
      text: "Erst wenn das laufende Speichern fertig ist",
    },
  ])("tells the file row's state: $text", async ({ state, text }) => {
    const { option } = await mountShare({ exportState: state });

    expect(option("Glissando-Datei").querySelector("small")?.textContent).toBe(text);
  });

  it("gives the size of the file of a device slideshow, or says nothing of it when unknown", async () => {
    const sized = await mountShare({ storage: DEVICE });
    expect(sized.option("Glissando-Datei").querySelector("small")?.textContent).toMatch(/30/);
    destroy();
    const unknown = await mountShare({
      storage: DEVICE,
      exportState: { kind: "idle", sizeBytes: null },
    });
    expect(unknown.option("Glissando-Datei").querySelector("small")?.textContent).not.toMatch(/\d/);
  });

  it.each([
    { row: "Link teilen", sheet: "Per Link teilen" },
    { row: "Video", sheet: "Video" },
    { row: "Webseite", sheet: "Webseite" },
    { row: "Glissando-Datei", sheet: "Glissando-Datei" },
  ])("opens $row's own sheet, and Zurück returns to the chooser", async ({ row, sheet }) => {
    const { heading, option, labelled, press, eyebrows } = await mountShare();

    await press(option(row));
    expect(heading()).toBe(sheet);
    await press(labelled("Zurück"));

    expect(heading()).toBe("Teilen");
    expect(eyebrows()).toHaveLength(2);
  });

  it("closes everything with Schließen and gives the focus back to the Share button", async () => {
    const { dialog, option, labelled, press, calls, shareButton } = await mountShare();
    await press(option("Video"));

    await press(labelled("Schließen"));

    expect(dialog()).toBeNull();
    expect(calls.closed).toBe(1);
    expect(document.activeElement).toBe(shareButton());
  });

  it("goes back to the chooser with Esc in a nested sheet, and closes with the next Esc", async () => {
    const { dialog, option, heading, press, calls } = await mountShare();
    await press(option("Video"));
    expect(heading()).not.toBe("Teilen");

    dialog()?.dispatchEvent(new Event("cancel", { cancelable: true }));
    await tick();
    flushSync();

    expect(heading()).toBe("Teilen");
    expect(option("Video")).toBeDefined();
    expect(calls.closed).toBe(0);

    dialog()?.dispatchEvent(new Event("cancel", { cancelable: true }));
    await tick();
    flushSync();

    expect(dialog()).toBeNull();
    expect(calls.closed).toBe(1);
  });

  it("goes back to the chooser with Esc in the Glissando file sheet", async () => {
    const { dialog, option, heading, press } = await mountShare();
    await press(option("Glissando-Datei"));
    expect(heading()).toBe("Glissando-Datei");

    dialog()?.dispatchEvent(new Event("cancel", { cancelable: true }));
    await tick();
    flushSync();

    expect(heading()).toBe("Teilen");
  });

  it("closes everything with a tap on the scrim in a nested sheet", async () => {
    const { dialog, option, press, calls } = await mountShare();
    await press(option("Glissando-Datei"));

    dialog()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    flushSync();

    expect(dialog()).toBeNull();
    expect(calls.closed).toBe(1);
  });
});
