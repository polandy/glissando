import { afterEach, describe, expect, it } from "vitest";
import { flushSync } from "svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { slideshowWith } from "./music-editor-harness";
import { musicEditorView } from "./music-editor-view";
import WaveformBars from "./WaveformBars.svelte";

let destroy = () => {};
afterEach(() => destroy());

describe("WaveformBars while the track is decoded", () => {
  it("shows a status label until the peaks arrive, then the bars", () => {
    const props = reactiveProps({
      music: musicEditorView(slideshowWith(), new Map(), "m1"),
      peaks: null as Float32Array | null,
      width: 300,
      details: false,
    });
    const mounted = mountWithTranslator(WaveformBars, props);
    destroy = mounted.destroy;
    const label = () => mounted.target.querySelector('[role="status"]');
    const bars = () => mounted.target.querySelectorAll("svg.bars rect");

    expect(label()?.textContent).toBe("Song wird gelesen …");
    expect(bars().length).toBe(0);

    props.peaks = new Float32Array(200).fill(1);
    flushSync();

    expect(bars().length).toBeGreaterThan(0);
    expect(label()).toBeNull();
  });
});
