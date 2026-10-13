import { afterEach, describe, expect, it } from "vitest";
import { BACKDROP_BLUR_RADIUS_SHARE } from "../backdrop-blur";
import {
  BLUE,
  GREEN,
  RED,
  solidPicture,
  standingStill,
  viewportBox,
} from "../testing/browser-pictures";
import { DomRenderer } from "./dom-renderer";

const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
/** A square picture on a 16:9 screen hides more than a third of itself covering: blurred fill. */
const VIEWPORT = { width: 1920, height: 1080 };

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp() {
  box = viewportBox(VIEWPORT);
  const renderer = new DomRenderer(box, () => undefined);
  return {
    renderer,
    red: await solidPicture(RED),
    green: await solidPicture(GREEN),
    blue: await solidPicture(BLUE),
  };
}

function backdropOf(front: HTMLImageElement): HTMLElement | null {
  return front.parentElement?.parentElement?.querySelector("img[data-backdrop]") ?? null;
}

describe("DomRenderer: the blurred fill (ADR-0028)", () => {
  it("fades a blurred fill's backdrop and front as one group, so the backdrop does not show through the front", async () => {
    const { renderer, red, blue } = await setUp();

    renderer.render({
      kind: "transition",
      effect: "crossfade",
      progress: 0.5,
      from: { picture: red, motion: STILL, fit: "cover" },
      to: { picture: blue, motion: STILL },
    });

    const wrapper = blue.element.parentElement;
    const group = wrapper?.parentElement;
    const backdrop = backdropOf(blue.element);
    expect(backdrop?.parentElement).toBe(group);
    expect(group?.style.opacity).toBe("0.5");
    expect(getComputedStyle(wrapper as HTMLElement).opacity).toBe("1");
    expect(getComputedStyle(backdrop as HTMLElement).opacity).toBe("1");
    expect(backdrop?.compareDocumentPosition(blue.element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("blurs the backdrop by the same share of the picture's long side as the WebGL renderer", async () => {
    const { renderer, red } = await setUp();

    renderer.render({ kind: "slide", slide: { picture: red, motion: STILL } });

    const radius = BACKDROP_BLUR_RADIUS_SHARE * Math.max(red.width, red.height);
    expect(backdropOf(red.element)?.style.filter).toContain(`blur(${radius}px)`);
  });

  it("puts a blurred-fill slide's caption after its whole group", async () => {
    const { renderer, red } = await setUp();

    renderer.render({ kind: "slide", slide: { picture: red, motion: STILL, caption: "Lake" } });

    const caption = box.querySelector("[data-caption]");
    expect(caption?.textContent).toBe("Lake");
    expect(caption?.previousElementSibling?.contains(red.element)).toBe(true);
    expect(caption?.previousElementSibling?.querySelector("img[data-backdrop]")).not.toBeNull();
  });

  it("removes the wrapper and backdrop once the next slide covers the screen", async () => {
    const { renderer, red, blue } = await setUp();
    renderer.render({ kind: "slide", slide: { picture: red, motion: STILL } });
    expect(box.querySelector("img[data-backdrop]")).not.toBeNull();

    renderer.render({ kind: "slide", slide: { picture: blue, motion: STILL, fit: "cover" } });

    expect(blue.element.isConnected).toBe(true);
    expect(red.element.isConnected).toBe(false);
    expect(box.querySelector("img[data-backdrop]")).toBeNull();
    expect(box.querySelector("[data-layer-wrapper]")).toBeNull();
  });

  it("removes the wrapper and backdrop of a forgotten picture", async () => {
    const { renderer, red } = await setUp();
    renderer.render({ kind: "slide", slide: { picture: red, motion: STILL } });
    expect(box.querySelector("img[data-backdrop]")).not.toBeNull();

    renderer.forget(red);

    expect(box.querySelector("img[data-backdrop]")).toBeNull();
    expect(box.querySelector("[data-layer-wrapper]")).toBeNull();
  });

  it("draws both slides of a transition from a pair into a blurred fill, the incoming one on top", async () => {
    const { renderer, red, green, blue } = await setUp();

    renderer.render({
      kind: "transition",
      effect: "crossfade",
      progress: 0.5,
      from: { picture: red, motion: STILL, partner: { picture: green, motion: STILL } },
      to: { picture: blue, motion: STILL },
    });

    for (const element of [red.element, green.element, blue.element]) {
      expect(element.parentElement?.hasAttribute("data-layer-wrapper")).toBe(true);
    }
    expect(backdropOf(blue.element)).not.toBeNull();
    expect(green.element.compareDocumentPosition(blue.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
