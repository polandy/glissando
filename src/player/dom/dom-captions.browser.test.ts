import { afterEach, describe, expect, it } from "vitest";
import { BLUE, RED, solidPicture, viewportBox } from "../testing/browser-pictures";
import { DomRenderer } from "./dom-renderer";

const VIEWPORT = { width: 160, height: 90 };
const FRAMING = { zoom: 1.5, centerX: 0.4, centerY: 0.6 };
const CAPTION = "Evening on the jetty";

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp() {
  box = viewportBox(VIEWPORT);
  const renderer = new DomRenderer(box, () => undefined);
  return { renderer, outgoing: await solidPicture(RED), incoming: await solidPicture(BLUE) };
}

function captionElements(): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>("[data-caption]")];
}

describe("DomRenderer captions", () => {
  it("shows a slide's caption over its picture, unmoved by the Ken Burns transform", async () => {
    const { renderer, outgoing } = await setUp();

    renderer.render({
      kind: "slide",
      slide: { picture: outgoing, framing: FRAMING, caption: CAPTION },
    });

    const [caption] = captionElements();
    expect(caption?.textContent).toBe(CAPTION);
    expect(caption?.previousElementSibling).toBe(outgoing.element);
    expect(caption?.getBoundingClientRect().bottom).toBe(box.getBoundingClientRect().bottom);
    expect(caption?.getBoundingClientRect().left).toBe(box.getBoundingClientRect().left);
  });

  it("fades the caption with its slide", async () => {
    const { renderer, outgoing, incoming } = await setUp();

    renderer.render({
      kind: "transition",
      effect: "crossfade",
      progress: 0.25,
      from: { picture: outgoing, framing: FRAMING },
      to: { picture: incoming, framing: FRAMING, caption: CAPTION },
    });

    const [caption] = captionElements();
    expect(caption?.previousElementSibling).toBe(incoming.element);
    expect(caption?.style.opacity).toBe("0.25");
  });

  it("removes the caption with its slide", async () => {
    const { renderer, outgoing, incoming } = await setUp();
    renderer.render({
      kind: "slide",
      slide: { picture: outgoing, framing: FRAMING, caption: CAPTION },
    });

    renderer.render({ kind: "slide", slide: { picture: incoming, framing: FRAMING } });

    expect(incoming.element.isConnected).toBe(true);
    expect(captionElements()).toEqual([]);
  });

  it("lifts the caption by the inset", async () => {
    const { renderer, outgoing } = await setUp();
    renderer.setCaptionInset(30);

    renderer.render({
      kind: "slide",
      slide: { picture: outgoing, framing: FRAMING, caption: CAPTION },
    });

    const [caption] = captionElements();
    expect(caption?.getBoundingClientRect().bottom).toBe(box.getBoundingClientRect().bottom - 30);
  });
});
