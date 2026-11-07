import "../styles/tokens.css";
import "../styles/base.css";
import { flushSync, type Component } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, server } from "vitest/browser";
import type { ExportMenuState } from "./glissando-file/export-menu";
import DeleteDialog from "./screens/slideshow/DeleteDialog.svelte";
import MoreMenu from "./screens/slideshow/MoreMenu.svelte";
import MoveToSheet from "./screens/slideshow/MoveToSheet.svelte";
import GlissandoFileSheet from "./screens/slideshow/share/GlissandoFileSheet.svelte";
import ShareChooser from "./screens/slideshow/share/ShareChooser.svelte";
import { emulateCoarsePointer } from "./testing/coarse-pointer";
import { mountWithTranslator } from "./testing/mount-with-translator";
import { touchTargetViolations } from "./testing/touch-target";

/** Firefox and WebKit cannot turn a coarse pointer on per test; Chromium can. */
const canEmulate = server.browser === "chromium";
const PHONE = { width: 390, height: 844 };
const THEMES = ["light", "dark"] as const;
const SUBJECT = { title: "Sommer am See", pictureCount: 12, durationSeconds: 90, hasMusic: true };
const IDLE: ExportMenuState = { kind: "idle", sizeBytes: 4_000_000 };

let destroy = () => {};
beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  await emulateCoarsePointer(true);
});
afterEach(async () => {
  destroy();
  destroy = () => {};
  document.documentElement.removeAttribute("data-theme");
  await emulateCoarsePointer(false);
});

function mount<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const mounted = mountWithTranslator(component, props);
  destroy = mounted.destroy;
  return mounted.target;
}

describe.skipIf(!canEmulate).each(THEMES)("sheet touch targets, %s theme", (theme) => {
  beforeEach(() => document.documentElement.setAttribute("data-theme", theme));

  it("gives every control of the share chooser a 44 px square", () => {
    const target = mount(ShareChooser, {
      subject: SUBJECT,
      link: { kind: "server", url: null },
      exportState: IDLE,
      onServer: false,
      onChooseLink: () => {},
      onChooseVideo: () => {},
      onChooseWebPage: () => {},
      onChooseFile: () => {},
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the Glissando file sheet a 44 px square", () => {
    const target = mount(GlissandoFileSheet, {
      subject: SUBJECT,
      exportState: IDLE,
      onSave: () => Promise.resolve({ kind: "saved" } as never),
      onBack: () => {},
      onClose: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the move sheet a 44 px square", () => {
    const target = mount(MoveToSheet, {
      orderLength: 12,
      startNumber: 3,
      onMove: () => {},
      onCancel: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every control of the delete dialog a 44 px square", () => {
    const target = mount(DeleteDialog, {
      title: "Sommer am See",
      pictureCount: 12,
      onServer: true,
      onKeep: () => {},
      onDelete: () => {},
    });

    expect(touchTargetViolations(target)).toEqual([]);
  });

  it("gives every item of the more menu a 44 px square", () => {
    const target = mount(MoreMenu, {
      onDelete: () => {},
      storage: { kind: "device", fromImmich: 2, fromDevice: 10 },
      pictureCount: 12,
      onStorageAction: () => {},
      focusFailed: 3,
      onFocus: () => {},
    });
    // The toggle sits in a header in the app; the margin keeps its pad inside the viewport.
    target.style.padding = "40px";
    expect(touchTargetViolations(target)).toEqual([]);

    target.querySelector<HTMLButtonElement>('button[aria-label="Mehr"]')?.click();
    flushSync();
    expect(target.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);

    // The open menu's scrim lies over the toggle: a tap there closes the menu.
    const items = touchTargetViolations(target).filter(
      (line) => !line.startsWith("button.icon-btn"),
    );
    expect(items).toEqual([]);
  });
});
