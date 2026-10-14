import { afterEach, describe, expect, it } from "vitest";
import { RED, solidPicture, standingStill, viewportBox } from "../testing/browser-pictures";
import type { Card } from "../slideshow";
import { DomRenderer } from "./dom-renderer";

const VIEWPORT = { width: 160, height: 90 };
const MOTION = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
const GROUND = "#2A2340";

let box: HTMLElement;
afterEach(() => box.remove());

function setUp(): { renderer: DomRenderer } {
  box = viewportBox(VIEWPORT);
  return { renderer: new DomRenderer(box, () => undefined) };
}

function groundCard(overrides: Partial<Card> = {}): Card {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    ink: "light",
    ...overrides,
  };
}

describe("DomRenderer: title cards (ADR-0032)", () => {
  it("fills a ground slide with its colour and draws the title in its style's font", () => {
    const { renderer } = setUp();
    const card = groundCard();

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: {
        kind: "ground",
        ground: GROUND,
        card: { card, textOpacity: 1, driftEm: 0, veilAmount: 0 },
      },
    });

    const corner = document.elementFromPoint(
      box.getBoundingClientRect().left + 1,
      box.getBoundingClientRect().top + 1,
    );
    expect(getComputedStyle(corner as Element).backgroundColor).toBe("rgb(42, 35, 64)");
    const title = box.querySelector<HTMLElement>("[data-card-title]");
    expect(title?.textContent).toBe(card.title);
    expect(getComputedStyle(title as Element).fontFamily).toContain("Bricolage Grotesque");
  });

  it("desaturates a veiled picture slide's filter below 1", async () => {
    const { renderer } = setUp();
    const picture = await solidPicture(RED);
    const card = groundCard({ veil: { amount: 0.5, tint: GROUND } });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: {
        kind: "picture",
        picture,
        motion: MOTION,
        fit: "cover",
        card: { card, textOpacity: 1, driftEm: 0, veilAmount: 0.5 },
      },
    });

    const filter = picture.element.style.filter;
    const [, saturation] = filter.match(/saturate\(([\d.]+)\)/) ?? [];
    expect(Number(saturation)).toBeLessThan(1);
  });

  it("removes a settled veil's filter and tint", async () => {
    const { renderer } = setUp();
    const picture = await solidPicture(RED);
    const card = groundCard({ veil: { amount: 0.5, tint: GROUND } });

    renderer.render({
      kind: "slide",
      endFade: 0,
      slide: {
        kind: "picture",
        picture,
        motion: MOTION,
        fit: "cover",
        card: { card, textOpacity: 1, driftEm: 0, veilAmount: 0 },
      },
    });

    expect(picture.element.style.filter).toBe("");
    expect(box.querySelector("[data-veil-tint]")).toBeNull();
  });

  it("mixes the whole frame to black at endFade 1", async () => {
    const { renderer } = setUp();
    const picture = await solidPicture(RED);

    renderer.render({
      kind: "slide",
      endFade: 1,
      slide: { kind: "picture", picture, motion: MOTION, fit: "cover" },
    });

    const overlay = box.querySelector<HTMLElement>("[data-end-fade]");
    expect(getComputedStyle(overlay as Element).backgroundColor).toBe("rgb(0, 0, 0)");
    expect(overlay?.style.opacity).toBe("1");
  });
});
