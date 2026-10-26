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

function mount(on: boolean, disabled: boolean, onRepeatMusic: (value: true | undefined) => void) {
  const mounted = mountWithTranslator(
    RepeatMusicSection,
    { on, disabled, onRepeatMusic },
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
  it("says repeating is not needed once the music already outlasts the slideshow", () => {
    const target = mount(false, true, () => {});

    expect(switchInput(target).disabled).toBe(true);
    expect(target.textContent).toContain("Not needed");
  });

  it("explains it plays the songs again while it is on", () => {
    const target = mount(true, false, () => {});

    expect(switchInput(target).checked).toBe(true);
    expect(target.textContent).toContain("Plays the songs again");
  });

  it("explains a shorter music fits instead while it is off", () => {
    const target = mount(false, false, () => {});

    expect(target.textContent).toContain("a shorter music is fitted or offers a fix instead");
  });

  it("turns the switch on and off through onRepeatMusic, true or undefined", () => {
    const calls: (true | undefined)[] = [];
    const target = mount(false, false, (value) => calls.push(value));

    switchInput(target).click();
    flushSync();
    expect(calls).toEqual([true]);
  });
});
