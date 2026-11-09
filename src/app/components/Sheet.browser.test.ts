import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import Sheet from "./Sheet.svelte";

let destroy = () => {};
afterEach(() => destroy());

const LABEL_ID = "sheet-test-title";
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

function mountSheet(props: {
  onClose?: () => void;
  onCancel?: () => void;
  onOpen?: () => void;
  closeOnScrim?: boolean;
  placement?: "center" | "side" | "corner";
  body?: string;
}) {
  const { body = `<button type="button">Innen</button>`, ...sheetProps } = props;
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(Sheet, {
    target,
    props: {
      labelId: LABEL_ID,
      onClose: () => {},
      ...sheetProps,
      children: createRawSnippet(() => ({
        render: () => `<div><h2 id="${LABEL_ID}">Titel</h2>${body}</div>`,
      })),
    },
  });
  flushSync();
  destroy = () => {
    void unmount(instance);
    target.remove();
  };
  const dialog = target.querySelector("dialog");
  if (dialog === null) {
    throw new Error("the sheet rendered no dialog");
  }
  return { target, dialog };
}

function pressEscape(dialog: HTMLDialogElement): void {
  dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
}

describe("Sheet", () => {
  it("opens as a modal dialog named by its heading", () => {
    const { dialog } = mountSheet({});

    expect(dialog.open).toBe(true);
    expect(dialog.matches(":modal")).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe(LABEL_ID);
  });

  it("calls onOpen once the dialog is open, so it can move focus inside", () => {
    let openWhenCalled: boolean | null = null;
    const { dialog } = mountSheet({
      onOpen: () => (openWhenCalled = document.querySelector("dialog")?.open ?? null),
    });

    expect(dialog.open).toBe(true);
    expect(openWhenCalled).toBe(true);
  });

  it("closes on Esc and keeps the dialog open for the owner to unmount", () => {
    let closes = 0;
    const { dialog } = mountSheet({ onClose: () => (closes += 1) });

    pressEscape(dialog);

    expect(closes).toBe(1);
    expect(dialog.open).toBe(true);
  });

  it("goes to onCancel on Esc when there is one, not to onClose", () => {
    let closes = 0;
    let cancels = 0;
    const { dialog } = mountSheet({
      onClose: () => (closes += 1),
      onCancel: () => (cancels += 1),
    });

    pressEscape(dialog);

    expect(cancels).toBe(1);
    expect(closes).toBe(0);
  });

  it("closes on a tap beside the sheet but not on one inside it", () => {
    let closes = 0;
    const { dialog } = mountSheet({ onClose: () => (closes += 1) });

    dialog.querySelector("button")?.click();
    expect(closes).toBe(0);

    dialog.click();
    expect(closes).toBe(1);
  });

  it("ignores a tap beside the sheet where something would be lost", () => {
    let closes = 0;
    let cancels = 0;
    const { dialog } = mountSheet({
      onClose: () => (closes += 1),
      onCancel: () => (cancels += 1),
      closeOnScrim: false,
    });

    pressEscape(dialog);
    dialog.click();

    expect(cancels).toBe(1);
    expect(closes).toBe(0);
  });

  it("closes the dialog when it is unmounted", () => {
    const { dialog } = mountSheet({});
    expect(dialog.open).toBe(true);

    destroy();
    destroy = () => {};

    expect(dialog.open).toBe(false);
  });

  it("docks the corner placement 380 px wide under the header at the top right", async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
    const { dialog } = mountSheet({ placement: "corner" });

    const box = dialog.getBoundingClientRect();
    expect(box.width).toBeCloseTo(380);
    expect(box.top).toBeCloseTo(72);
    expect(DESKTOP.width - box.right).toBeCloseTo(24);
  });

  it("makes the corner placement a bottom sheet on a phone", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { dialog } = mountSheet({ placement: "corner" });

    const box = dialog.getBoundingClientRect();
    expect(box.width).toBeCloseTo(PHONE.width);
    expect(box.bottom).toBeCloseTo(PHONE.height);
  });

  it("keeps a long unbroken line from widening the sheet", async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
    const { dialog } = mountSheet({
      body: `<p style="white-space: nowrap; overflow: hidden">${"x".repeat(400)}</p>`,
    });

    expect(dialog.scrollWidth).toBe(dialog.clientWidth);
  });
});
