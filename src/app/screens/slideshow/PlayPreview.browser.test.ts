import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import PlayPreview from "./PlayPreview.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountPreview(pulse?: boolean) {
  const mounted = mountWithTranslator(PlayPreview, {
    coverUrl: "cover.jpg",
    durationSeconds: 60,
    onPlay: () => {},
    ...(pulse === undefined ? {} : { pulse }),
  });
  destroy = mounted.destroy;
  const pill = mounted.target.querySelector(".pill");
  if (pill === null) {
    throw new Error("the Play pill is missing");
  }
  return pill;
}

describe("PlayPreview", () => {
  it("pulses its Play pill once when told to", () => {
    const pill = mountPreview(true);

    expect(pill.classList.contains("pulse")).toBe(true);
    expect(getComputedStyle(pill).animationName).not.toBe("none");
    expect(getComputedStyle(pill).animationIterationCount).toBe("1");
  });

  it("does not pulse by default", () => {
    const pill = mountPreview();

    expect(pill.classList.contains("pulse")).toBe(false);
    expect(getComputedStyle(pill).animationName).toBe("none");
  });
});
