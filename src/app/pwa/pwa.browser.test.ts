import { afterEach, describe, expect, it } from "vitest";
import type { StatusBarAction, StatusBarView } from "../../pwa/status-bar-view";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PwaSheet from "./PwaSheet.svelte";
import StatusBar from "./StatusBar.svelte";

let destroy = () => {};
afterEach(() => destroy());

const HIDE_HINT = "Hinweis ausblenden";

function buttonNamed(target: HTMLElement, name: string): HTMLButtonElement {
  const found = [...target.querySelectorAll("button")].find(
    (button) => (button.getAttribute("aria-label") ?? button.textContent?.trim()) === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

function mountStatusBar(view: StatusBarView, { narrow = false } = {}) {
  const actions: StatusBarAction[] = [];
  let dismissed = 0;
  const mounted = mountWithTranslator(StatusBar, {
    view,
    onAction: (action: StatusBarAction) => actions.push(action),
    onDismissHint: () => (dismissed += 1),
  });
  destroy = mounted.destroy;
  // The screen is the query container; narrower than 720 px is the phone layout.
  mounted.target.style.containerType = "inline-size";
  mounted.target.style.width = narrow ? "400px" : "1000px";
  return { target: mounted.target, actions, dismissed: () => dismissed };
}

const NONE: StatusBarAction = { kind: "none" };

describe("StatusBar", () => {
  it.each([
    {
      status: "offline",
      wide: "Offline · gespeichert auf diesem Gerät",
      narrow: "Offline · auf diesem Gerät",
    },
    {
      status: "insecure",
      wide: "Nur online · über diese Adresse kein Offline-Modus und keine Installation",
      narrow: "Nur online · ohne Offline-Modus",
    },
    {
      status: "storageRefused",
      wide: "Offline · auf diesem Gerät, aber nicht dauerhaft gespeichert",
      narrow: "Offline · nicht dauerhaft gespeichert",
    },
    {
      status: "installed",
      wide: "Installiert · offline bereit · gespeichert auf diesem Gerät",
      narrow: "Installiert · offline bereit",
    },
  ] as const)("says $status in full, and shorter on a phone", ({ status, wide, narrow }) => {
    const { target } = mountStatusBar({ status, action: NONE });
    expect(target.innerText.trim()).toBe(wide);
    target.style.width = "400px";
    expect(target.innerText.trim()).toBe(narrow);
  });

  it("offers no button when there is nothing to do", () => {
    const { target } = mountStatusBar({ status: "offline", action: NONE });
    expect(target.textContent).toContain("Offline");
    expect(target.querySelector("button")).toBeNull();
  });

  it.each([
    { action: { kind: "reload" }, label: "Neue Version · Neu laden" },
    { action: { kind: "why" }, label: "Warum?" },
    { action: { kind: "installPrompt", dismissible: true }, label: "App installieren" },
    {
      action: { kind: "installGuide", guide: "ios", dismissible: true },
      label: "Als App installieren",
    },
  ] as const)("offers $label", ({ action, label }) => {
    const { target, actions } = mountStatusBar({ status: "offline", action });
    buttonNamed(target, label).click();
    expect(actions).toEqual([action]);
  });

  it("hides a dismissible install hint with its ✕", () => {
    const { target, dismissed } = mountStatusBar({
      status: "offline",
      action: { kind: "installPrompt", dismissible: true },
    });
    buttonNamed(target, HIDE_HINT).click();
    expect(dismissed()).toBe(1);
  });

  it("has no ✕ on a hint that cannot be hidden", () => {
    const { target } = mountStatusBar({
      status: "storageRefused",
      action: { kind: "installGuide", guide: "ios", dismissible: false },
    });
    expect(buttonNamed(target, "Als App installieren")).toBeDefined();
    expect(target.querySelector(`[aria-label="${HIDE_HINT}"]`)).toBeNull();
  });
});

describe("PwaSheet", () => {
  function mountSheet(
    sheet: Parameters<typeof PwaSheet>[1]["sheet"],
    language: "de" | "en" = "de",
  ) {
    let closed = 0;
    const mounted = mountWithTranslator(
      PwaSheet,
      { sheet, onClose: () => (closed += 1) },
      { current: createTranslator(language) },
    );
    destroy = mounted.destroy;
    const dialog = mounted.target.querySelector("dialog");
    if (dialog === null) {
      throw new Error("no dialog shown");
    }
    return { dialog, closed: () => closed };
  }

  function steps(dialog: HTMLElement): string[] {
    return [...dialog.querySelectorAll("ol li")].map((step) => step.textContent?.trim() ?? "");
  }

  function keys(dialog: HTMLElement): string[] {
    return [...dialog.querySelectorAll("ol .key")].map((key) => key.textContent?.trim() ?? "");
  }

  it("guides iOS through the share sheet, the browser's buttons as keys", () => {
    const { dialog, closed } = mountSheet({ kind: "guide", guide: "ios" });
    expect(dialog.querySelector("h3")?.textContent).toBe("Glissando als App");
    expect(steps(dialog)).toEqual([
      "Tippe unten auf Teilen",
      "Wähle Zum Home-Bildschirm",
      "Tippe auf Hinzufügen",
    ]);
    expect(keys(dialog)).toEqual(["Teilen", "Zum Home-Bildschirm", "Hinzufügen"]);
    expect(dialog.textContent).toContain("Danach startest du Glissando vom Home-Bildschirm");
    buttonNamed(dialog, "Verstanden").click();
    expect(closed()).toBe(1);
  });

  it("names Safari's menu items on the Mac in English", () => {
    const { dialog } = mountSheet({ kind: "guide", guide: "mac-safari" }, "en");
    expect(steps(dialog)).toEqual(["Open the File menu", "Choose Add to Dock…", "Click Add"]);
  });

  it("guides Firefox on Android through its menu", () => {
    const { dialog } = mountSheet({ kind: "guide", guide: "firefox-android" });
    expect(keys(dialog)).toEqual(["Menü", "Zum Startbildschirm hinzufügen", "Hinzufügen"]);
  });

  it("tells Firefox on the computer that it does not install apps", () => {
    const { dialog } = mountSheet({ kind: "guide", guide: "firefox-desktop" });
    expect(dialog.querySelector("h3")?.textContent).toBe("Firefox installiert keine Apps");
    expect(dialog.textContent).toContain("Chrome, Edge oder Safari");
    expect(dialog.querySelector("ol")).toBeNull();
  });

  it("explains why the app is online only at an insecure address", () => {
    const { dialog } = mountSheet({ kind: "why", address: "http://192.168.1.20:4173" });
    expect(dialog.querySelector("h3")?.textContent).toBe("Warum nur online?");
    expect(dialog.textContent).toContain(
      "Die Adresse http://192.168.1.20:4173 ist unverschlüsselt.",
    );
    expect(dialog.textContent).toContain("Caddy oder Tailscale");
  });
});
