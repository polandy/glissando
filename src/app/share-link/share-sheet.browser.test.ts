import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ShareLink } from "../../server-library/server-library-client";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { COPIED_FEEDBACK_MS, ShareLinkSession } from "./share-link-session";
import ShareLinkControl from "./ShareLinkControl.svelte";
import { FakeShareLinkApi } from "./testing/fake-share-link-api";

const LINK: ShareLink = { token: "q7Rk2vN8xT4mWp1Lc9Hb3A", createdAt: "2026-10-11T09:30:00.000Z" };
const SUBJECT = { title: "Sommer 2025", pictureCount: 50, durationSeconds: 250, hasMusic: true };

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

async function mountControl({
  shared = null as ShareLink | null,
  origin = "https://photos.example.org",
  withShareSheet = true,
  withClipboard = true,
  device = false,
} = {}) {
  const api = new FakeShareLinkApi("show", shared);
  const scheduler = new FakeScheduler();
  const toasts: string[] = [];
  const session = new ShareLinkSession("show", {
    api,
    origin,
    scheduler,
    clipboard: withClipboard ? { writeText: () => Promise.resolve() } : null,
    shareSheet: withShareSheet ? () => Promise.resolve() : null,
    openTab: () => {},
    onTurnedOff: () => toasts.push("Link ausgeschaltet"),
    onError: (error) => {
      throw error;
    },
  });
  const mounted = mountWithTranslator(ShareLinkControl, {
    session: device ? null : session,
    subject: SUBJECT,
  });
  destroy = mounted.destroy;
  await settle();
  const { target } = mounted;

  async function settle(): Promise<void> {
    await api.settled();
    flushSync();
  }
  const dialog = () => target.querySelector("dialog");
  const button = (text: string): HTMLButtonElement => {
    const found = [...target.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    if (found === undefined) throw new Error(`no button "${text}" in ${target.innerText}`);
    return found;
  };
  const click = async (text: string) => {
    button(text).click();
    await settle();
  };
  const row = () => target.querySelector<HTMLElement>(".share-row");
  const openSheet = async () => {
    row()?.click();
    await settle();
  };
  return { target, api, scheduler, toasts, dialog, button, click, row, openSheet };
}

describe("The share row and sheet (SHARE_LINK.md, In the app)", () => {
  it("offers a server slideshow that is not shared to be shared", async () => {
    const { row } = await mountControl();

    expect(row()?.tagName).toBe("BUTTON");
    expect(row()?.textContent).toContain("Link teilen");
    expect(row()?.textContent).toContain("Alle mit dem Link können zuschauen");
  });

  it("shows a shared slideshow's link without its scheme and the On pill", async () => {
    const { row } = await mountControl({ shared: LINK });

    expect(row()?.textContent).toContain("Per Link geteilt");
    expect(row()?.querySelector(".url")?.textContent).toBe(
      "photos.example.org/s/q7Rk2vN8xT4mWp1Lc9Hb3A",
    );
    expect(row()?.querySelector(".on-pill")?.textContent).toBe("An");
  });

  it("dims a device slideshow's row, not a button, saying how to share it", async () => {
    const { row } = await mountControl({ device: true });

    expect(row()?.textContent).toContain(
      "Speichere sie auf deinem Glissando-Server, um sie per Link zu teilen.",
    );
    expect(row()?.tagName).toBe("DIV");
  });

  it("explains the link before making it, then shows it once made", async () => {
    const { dialog, click, openSheet, api, row } = await mountControl();

    await openSheet();
    expect(dialog()?.querySelector("h2")?.textContent).toBe("Per Link teilen");
    expect(dialog()?.textContent).toContain("Sommer 2025 · 50 Bilder · 4:10 · mit Musik");
    expect(dialog()?.textContent).toContain("Sonst nichts");
    await click("Link erstellen");

    expect(dialog()?.querySelector("output")?.textContent).toBe(
      `https://photos.example.org/s/${api.shared?.token ?? ""}`,
    );
    expect(dialog()?.textContent).toContain("Erstellt am");
    expect(row()?.textContent).toContain("Per Link geteilt");
  });

  it("reads Kopiert for 2 s after copying, then Kopieren again", async () => {
    const { openSheet, click, button, scheduler } = await mountControl({ shared: LINK });
    await openSheet();

    await click("Kopieren");
    expect(button("Kopiert")).toBeTruthy();
    scheduler.advance(COPIED_FEEDBACK_MS);
    flushSync();

    expect(button("Kopieren")).toBeTruthy();
  });

  it("leaves Kopieren out where the browser has no clipboard, the link still selectable", async () => {
    const { openSheet, dialog } = await mountControl({ shared: LINK, withClipboard: false });
    await openSheet();

    const output = dialog()?.querySelector("output");
    expect(output?.textContent).toContain("/s/q7Rk2vN8xT4mWp1Lc9Hb3A");
    expect(output === null || output === undefined ? "" : getComputedStyle(output).userSelect).toBe(
      "all",
    );
    expect(dialog()?.textContent).not.toContain("Kopieren");
  });

  it("shows the link's QR code on QR-Code and hides it again", async () => {
    const { openSheet, click, button, dialog } = await mountControl({ shared: LINK });
    await openSheet();

    await click("QR-Code");
    expect(button("QR-Code").getAttribute("aria-pressed")).toBe("true");
    expect(dialog()?.querySelector('svg[aria-label="QR-Code des Links"] path')).not.toBeNull();
    await click("QR-Code");

    expect(button("QR-Code").getAttribute("aria-pressed")).toBe("false");
    expect(dialog()?.querySelector('svg[aria-label="QR-Code des Links"]')).toBeNull();
  });

  it.each([
    { withShareSheet: true, shown: true },
    { withShareSheet: false, shown: false },
  ])(
    "offers Teilen … only where the browser has a share sheet ($withShareSheet)",
    async ({ withShareSheet, shown }) => {
      const { openSheet, dialog } = await mountControl({ shared: LINK, withShareSheet });
      await openSheet();

      expect(dialog()?.textContent).toContain("Als Zuschauer öffnen");
      expect(dialog()?.textContent?.includes("Teilen …")).toBe(shown);
    },
  );

  it("asks before turning off, then closes with the toast and focus back on the row", async () => {
    const { openSheet, click, dialog, toasts, row, api } = await mountControl({ shared: LINK });
    await openSheet();

    await click("Link ausschalten");
    expect(dialog()?.querySelector("h2")?.textContent).toBe("Link ausschalten?");
    expect(dialog()?.textContent).toContain("„Sommer 2025“");
    await click("Link ausschalten");

    expect(toasts).toEqual(["Link ausgeschaltet"]);
    expect(api.shared).toBeNull();
    expect(row()?.textContent).toContain("Link teilen");
    expect(dialog()).toBeNull();
    await tick();
    expect(document.activeElement).toBe(row());
  });

  it.each([
    { origin: "http://192.168.1.20:8080", noted: true },
    { origin: "https://photos.example.org", noted: false },
  ])("notes a home network address for $origin: $noted", async ({ origin, noted }) => {
    const { openSheet, dialog } = await mountControl({ origin });
    await openSheet();

    expect(dialog()?.textContent).toContain("Link erstellen");
    expect(dialog()?.textContent?.includes("nur in deinem Heimnetz")).toBe(noted);
  });

  it("shows the server's error with Erneut versuchen, which creates the link", async () => {
    const { openSheet, click, dialog, api } = await mountControl();
    await openSheet();
    api.down = true;

    await click("Link erstellen");
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain(
      "Der Link wurde nicht erstellt. Dein Glissando-Server antwortet nicht.",
    );
    api.down = false;
    await click("Erneut versuchen");

    expect(dialog()?.querySelector('[role="alert"]')).toBeNull();
    expect(dialog()?.querySelector("output")).not.toBeNull();
  });
});
