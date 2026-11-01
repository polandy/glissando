import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import Toast from "../components/Toast.svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { mountScreen, selectionBar, tile, unmountScreen } from "./slideshow-screen-harness";

const THEMES = ["light", "dark"] as const;
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

let destroyToast = () => {};

afterEach(() => {
  destroyToast();
  unmountScreen();
  document.documentElement.removeAttribute("data-theme");
});

/** A remove-with-undo toast, the one that realistically appears while the bar is open. */
function showUndoToast(): HTMLElement {
  const mounted = mountWithTranslator(Toast, {
    toast: {
      text: "1 Bild entfernt",
      tone: "info",
      action: { label: "Rückgängig", run: () => {} },
    },
    onAction: () => {},
    onDismiss: () => {},
  });
  destroyToast = mounted.destroy;
  const toast = mounted.target.querySelector<HTMLElement>(".toast");
  if (toast === null) {
    throw new Error("the toast did not render");
  }
  return toast;
}

describe("a toast while the selection bar is open", () => {
  it.each(
    VIEWPORTS.flatMap((viewport) =>
      THEMES.map((theme) => ({ label: `${viewport.name}, ${theme}`, viewport, theme })),
    ),
  )("sits above the bar, never over it ($label)", async ({ viewport, theme }) => {
    document.documentElement.setAttribute("data-theme", theme);
    await page.viewport(viewport.width, viewport.height);
    mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();
    const bar = selectionBar();
    if (!(bar instanceof HTMLElement)) {
      throw new Error("the selection bar did not open");
    }

    const toast = showUndoToast();

    expect(bar.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(toast.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar.getBoundingClientRect().top,
    );
  });
});
