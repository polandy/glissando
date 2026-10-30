import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { TimingNote as TimingNoteKind } from "./music-timing-note";
import TimingNote from "./TimingNote.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mount(note: TimingNoteKind) {
  const mounted = mountWithTranslator(TimingNote, { note }, { current: createTranslator("en") });
  unmounts.push(mounted.destroy);
  return mounted.target;
}

describe("TimingNote", () => {
  it("says the automatic pictures shrink to fit a shorter music", () => {
    const target = mount({ kind: "fitted", shareMs: 3_300, onTheBeat: false });

    expect(target.textContent).toContain("shrinks to about 3.3 s");
    expect(target.textContent).toContain("to end with the music");
    expect(target.querySelector(".note")?.classList.contains("warn")).toBe(false);
  });

  it("mentions the beat once the fitted shares fall on it", () => {
    const target = mount({ kind: "fitted", shareMs: 2_000, onTheBeat: true });

    expect(target.textContent).toContain("each change on the nearest beat");
  });

  it("still warns while the pictures outlast the music, unaffected by the fitted case", () => {
    const target = mount({ kind: "outlasts", overMs: 5_000, automaticCount: 2 });

    expect(target.querySelector(".note")?.classList.contains("warn")).toBe(true);
  });
});
