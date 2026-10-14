import { afterEach, describe, expect, it } from "vitest";
import { BLUE, RED, solidPicture, standingStill, viewportBox } from "../testing/browser-pictures";
import { DomRenderer } from "./dom-renderer";

const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp(viewport: { width: number; height: number }) {
  box = viewportBox(viewport);
  const renderer = new DomRenderer(box, () => undefined);
  return { renderer, first: await solidPicture(RED), second: await solidPicture(BLUE) };
}

describe("DomRenderer: pairs and the blurred fill (ADR-0028)", () => {
  it("clips a pair's two halves side by side on a landscape screen, image left and partner right", async () => {
    const { renderer, first, second } = await setUp({ width: 200, height: 100 });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: {
        kind: "picture",
        picture: first,
        motion: STILL,
        partner: { picture: second, motion: STILL },
      },
    });

    const firstBox = first.element.parentElement?.getBoundingClientRect();
    const secondBox = second.element.parentElement?.getBoundingClientRect();
    expect(firstBox?.left).toBe(0);
    expect(secondBox?.right).toBeCloseTo(200, 0);
    expect(secondBox?.left).toBeGreaterThan(firstBox?.right ?? 0);
  });

  it("stacks a pair's two halves on a portrait screen, image on top and partner below", async () => {
    const { renderer, first, second } = await setUp({ width: 100, height: 200 });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: {
        kind: "picture",
        picture: first,
        motion: STILL,
        partner: { picture: second, motion: STILL },
      },
    });

    const firstBox = first.element.parentElement?.getBoundingClientRect();
    const secondBox = second.element.parentElement?.getBoundingClientRect();
    expect(firstBox?.top).toBe(0);
    expect(secondBox?.bottom).toBeCloseTo(200, 0);
    expect(secondBox?.top).toBeGreaterThan(firstBox?.bottom ?? 0);
  });

  it("wraps the front picture in a blurred fill and draws a second, filtered element behind it", async () => {
    // A square picture on a 16:9 screen hides more than a third of itself covering, so it is
    // drawn whole over a blurred, darkened backdrop (ADR-0028).
    const { renderer, first } = await setUp({ width: 1920, height: 1080 });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: { kind: "picture", picture: first, motion: STILL },
    });

    const wrapper = first.element.parentElement;
    expect(wrapper?.hasAttribute("data-layer-wrapper")).toBe(true);
    expect(wrapper?.style.width).not.toBe("1920px");
    const backdrop = box.querySelector("img[data-backdrop]");
    expect(backdrop).not.toBeNull();
    expect((backdrop as HTMLElement | null)?.style.filter).toContain("blur");
    expect((backdrop as HTMLElement | null)?.style.filter).toContain("brightness");
  });

  it("covers the whole screen with no backdrop when fit is cover", async () => {
    const { renderer, first } = await setUp({ width: 1920, height: 1080 });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: { kind: "picture", picture: first, motion: STILL, fit: "cover" },
    });

    expect(first.element.parentElement?.hasAttribute("data-layer-wrapper")).toBe(false);
    expect(box.querySelector("img[data-backdrop]")).toBeNull();
  });
});
