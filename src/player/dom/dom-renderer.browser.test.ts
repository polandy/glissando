import { afterEach, describe, expect, it } from "vitest";
import { cropAt } from "../ken-burns";
import { BLUE, RED, solidPicture, standingStill, viewportBox } from "../testing/browser-pictures";
import { DomRenderer } from "./dom-renderer";
import { layerTransform } from "./layer-transform";

const VIEWPORT = { width: 160, height: 90 };
const MOTION = standingStill({ zoom: 1.5, centerX: 0.4, centerY: 0.6 });

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp() {
  box = viewportBox(VIEWPORT);
  const renderer = new DomRenderer(box, () => undefined);
  return { renderer, outgoing: await solidPicture(RED), incoming: await solidPicture(BLUE) };
}

describe("DomRenderer", () => {
  it("shows a slide's picture opaque, framed by its Ken Burns crop", async () => {
    const { renderer, outgoing } = await setUp();

    renderer.render({ kind: "slide", slide: { picture: outgoing, motion: MOTION } });

    expect(outgoing.element.isConnected).toBe(true);
    expect(outgoing.element.style.opacity).toBe("1");
    const expected = new DOMMatrix(
      layerTransform(cropAt(MOTION, outgoing, VIEWPORT), outgoing, VIEWPORT),
    );
    const actual = new DOMMatrix(outgoing.element.style.transform);
    for (const component of ["a", "d", "e", "f"] as const) {
      expect(actual[component]).toBeCloseTo(expected[component], 6);
    }
  });

  it("crossfades: the incoming picture on top with the transition's progress as opacity", async () => {
    const { renderer, outgoing, incoming } = await setUp();
    renderer.render({ kind: "slide", slide: { picture: outgoing, motion: MOTION } });

    renderer.render({
      kind: "transition",
      effect: "circle-open",
      progress: 0.25,
      from: { picture: outgoing, motion: MOTION },
      to: { picture: incoming, motion: MOTION },
    });

    expect(outgoing.element.style.opacity).toBe("1");
    expect(incoming.element.style.opacity).toBe("0.25");
    expect(outgoing.element.nextElementSibling).toBe(incoming.element);
  });

  it("removes the outgoing picture once the transition is over", async () => {
    const { renderer, outgoing, incoming } = await setUp();
    renderer.render({ kind: "slide", slide: { picture: outgoing, motion: MOTION } });

    renderer.render({ kind: "slide", slide: { picture: incoming, motion: MOTION } });

    expect(incoming.element.isConnected).toBe(true);
    expect(outgoing.element.isConnected).toBe(false);
  });

  it("leaves the container empty when disposed", async () => {
    const { renderer, outgoing } = await setUp();
    renderer.render({ kind: "slide", slide: { picture: outgoing, motion: MOTION } });
    expect(box.childElementCount).toBe(1);

    renderer.dispose();

    expect(box.childElementCount).toBe(0);
  });
});
