import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import RepeatMusicSection from "./RepeatMusicSection.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mount(on: boolean, onRepeatMusic: (value: true | undefined) => void) {
  const mounted = mountWithTranslator(
    RepeatMusicSection,
    { on, onRepeatMusic },
    { current: createTranslator("en") },
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

function switchInput(target: HTMLElement): HTMLInputElement {
  const found = target.querySelector<HTMLInputElement>('input[role="switch"]');
  if (found === null) {
    throw new Error("no switch");
  }
  return found;
}

describe("RepeatMusicSection", () => {
  it("keeps the switch always enabled, on or off", () => {
    expect(switchInput(mount(true, () => {})).checked).toBe(true);
    const off = mount(false, () => {});

    expect(switchInput(off).checked).toBe(false);
    expect(switchInput(off).disabled).toBe(false);
  });

  it("moves the mechanics behind an info button, leaving no visible paragraph", () => {
    const target = mount(false, () => {});

    const info = target.querySelector<HTMLButtonElement>("button.info");
    expect(info?.getAttribute("aria-label")).toBe("About repeating the music");
    expect(target.querySelector(".pop")?.textContent).toContain("play again from the first song");
    expect(target.querySelectorAll("p:not(.pop p)")).toHaveLength(0);
  });

  it("turns the switch on and off through onRepeatMusic, true or undefined", () => {
    const calls: (true | undefined)[] = [];
    const target = mount(false, (value) => calls.push(value));

    switchInput(target).click();
    flushSync();
    expect(calls).toEqual([true]);
  });
});
