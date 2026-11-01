import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { mountWithTranslator } from "../testing/mount-with-translator";
import InfoButton from "./InfoButton.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const BODY = "the mechanics behind the control";

function mount() {
  const children = createRawSnippet(() => ({ render: () => `<p>${BODY}</p>` }));
  const mounted = mountWithTranslator(InfoButton, { label: "About it", children });
  unmounts.push(mounted.destroy);
  const button = mounted.target.querySelector<HTMLButtonElement>("button.info");
  const popover = mounted.target.querySelector<HTMLElement>(".pop");
  if (button === null || popover === null) throw new Error("no info button");
  return { button, popover };
}

describe("InfoButton", () => {
  it("is named by its label and keeps its text closed until opened", () => {
    const { button, popover } = mount();

    expect(button.getAttribute("aria-label")).toBe("About it");
    expect(popover.matches(":popover-open")).toBe(false);
    expect(popover.textContent).toContain(BODY);
  });

  it("opens under its button on a tap, inside the viewport", () => {
    const { button, popover } = mount();

    button.click();

    expect(popover.matches(":popover-open")).toBe(true);
    const box = popover.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(button.getBoundingClientRect().bottom);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  });

  it("closes on a second tap on its button", () => {
    const { button, popover } = mount();

    button.click();
    button.click();

    expect(popover.matches(":popover-open")).toBe(false);
  });

  it("closes on Esc", async () => {
    const { button, popover } = mount();
    button.click();
    expect(popover.matches(":popover-open")).toBe(true);

    await userEvent.keyboard("{Escape}");

    expect(popover.matches(":popover-open")).toBe(false);
  });
});
