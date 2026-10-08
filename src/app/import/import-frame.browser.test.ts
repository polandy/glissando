import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Toast from "../components/Toast.svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import ImportFrame from "./ImportFrame.svelte";

/** Taller than any test viewport, so the sticky action bar rests on the viewport's bottom. */
const TALL_BODY = createRawSnippet(() => ({ render: () => `<div style="height: 4000px"></div>` }));
const NEXT_BUTTON = createRawSnippet(() => ({
  render: () => `<button class="btn primary" type="button">Weiter</button>`,
}));

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

function mountFrame(): HTMLElement {
  const frame = mountWithTranslator(ImportFrame, {
    step: "pictures",
    onBack: () => undefined,
    children: TALL_BODY,
    actions: NEXT_BUTTON,
  });
  unmounts.push(frame.destroy);
  return frame.target;
}

function mountToast(): HTMLElement {
  const toast = mountWithTranslator(Toast, {
    toast: { text: "Diashow erstellt", tone: "info" },
    onAction: () => undefined,
    onDismiss: () => undefined,
  });
  unmounts.push(toast.destroy);
  const element = toast.target.querySelector<HTMLElement>(".toast");
  if (element === null) {
    throw new Error("the toast rendered no .toast element");
  }
  return element;
}

describe("ImportFrame", () => {
  it("keeps a toast clear above the wizard's bottom actions", () => {
    const frame = mountFrame();
    const actions = frame.querySelector(".actions");
    const toast = mountToast();

    expect(actions).not.toBeNull();
    expect(toast.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      actions?.getBoundingClientRect().top ?? 0,
    );
  });

  it("lets the toast return to the bottom once the wizard is gone", () => {
    const toast = mountToast();
    const restingBottom = toast.getBoundingClientRect().bottom;
    const unmountFrame = (mountFrame(), unmounts[unmounts.length - 1]);
    expect(toast.getBoundingClientRect().bottom).toBeLessThan(restingBottom);

    unmountFrame?.();

    expect(toast.getBoundingClientRect().bottom).toBe(restingBottom);
  });
});
