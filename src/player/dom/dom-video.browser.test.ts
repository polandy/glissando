import { afterEach, describe, expect, it } from "vitest";
import { BLUE, RED, solidPicture, standingStill, viewportBox } from "../testing/browser-pictures";
import type { BrowserPicture } from "../browser/picture-loader";
import type { PictureSlideLayer } from "../ports";
import { DomRenderer } from "./dom-renderer";

const VIEWPORT = { width: 160, height: 90 };
const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp() {
  box = viewportBox(VIEWPORT);
  const renderer = new DomRenderer(box, () => undefined);
  return { renderer, poster: await solidPicture(RED), other: await solidPicture(BLUE) };
}

function slide(
  picture: BrowserPicture,
  live?: HTMLVideoElement,
): PictureSlideLayer<BrowserPicture> {
  return {
    kind: "picture",
    picture,
    motion: STILL,
    fit: "cover",
    ...(live === undefined ? {} : { live }),
  };
}

describe("DomRenderer video slides", () => {
  it("shows the clip's element right after the poster, with the poster's placement", async () => {
    const { renderer, poster } = await setUp();
    const clip = document.createElement("video");

    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster, clip) });

    expect(poster.element.nextElementSibling).toBe(clip);
    expect(clip.style.transform).toBe(poster.element.style.transform);
    expect(clip.style.opacity).toBe("1");
  });

  it("keeps the same element across frames and draws no video for a plain picture", async () => {
    const { renderer, poster } = await setUp();
    const clip = document.createElement("video");
    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster, clip) });
    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster, clip) });
    expect(box.querySelectorAll("video")).toHaveLength(1);

    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster) });

    expect(box.querySelectorAll("video")).toHaveLength(0);
    expect(poster.element.isConnected).toBe(true);
  });

  it("removes the clip when its slide leaves the screen or is forgotten", async () => {
    const { renderer, poster, other } = await setUp();
    const clip = document.createElement("video");
    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster, clip) });

    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(other) });
    expect(clip.isConnected).toBe(false);

    renderer.render({ kind: "slide", endFade: 0, look: "none", slide: slide(poster, clip) });
    expect(clip.isConnected).toBe(true);
    renderer.forget(poster);
    expect(clip.isConnected).toBe(false);
  });
});
