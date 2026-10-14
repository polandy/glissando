import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Card } from "../../../../player/slideshow";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import CardFace from "./CardFace.svelte";

const CARD: Card = {
  title: "Juli 2025",
  subtitle: "1.–14. Juli",
  style: "modern",
  position: "centre",
  ink: "light",
};

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

async function waitForText(target: HTMLElement): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 20; attempt++) {
    flushSync();
    const text = target.querySelector<HTMLElement>(".text");
    if (text !== null) {
      return text;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(".text never appeared");
}

function mountFace(props: {
  card: Card;
  ground?: string;
  pictureUrl?: string;
  elapsedMs: number;
  reducedMotion?: boolean;
}) {
  const mounted = mountWithTranslator(CardFace, props);
  mounted.target.style.width = "320px";
  mounted.target.style.height = "180px";
  destroy = mounted.destroy;
  return mounted.target;
}

describe("CardFace", () => {
  it("draws the card's title and subtitle once its fonts settle", async () => {
    const target = mountFace({
      card: CARD,
      ground: "#2A2340",
      elapsedMs: 5000,
    });
    await waitForText(target);

    expect(target.textContent).toContain("Juli 2025");
    expect(target.textContent).toContain("1.–14. Juli");
  });

  it("shows the ground colour, not a picture, for a colour background", () => {
    const target = mountFace({ card: CARD, ground: "#8FD9C4", elapsedMs: 5000 });

    const ground = target.querySelector<HTMLElement>(".ground");
    expect(ground?.style.background).toContain("rgb(143, 217, 196)");
    expect(target.querySelector(".picture")).toBeNull();
  });

  it("tints the veil over a picture background at the card's veil amount", () => {
    const withVeil: Card = { ...CARD, veil: { amount: 0.6, tint: "#2A2340" } };
    const target = mountFace({ card: withVeil, pictureUrl: "pic.jpg", elapsedMs: 5000 });

    const veil = target.querySelector<HTMLElement>(".veil");
    expect(veil).not.toBeNull();
    expect(target.querySelector(".picture")).not.toBeNull();
  });

  it("fades the text in over the card's own timing, not shown at once", async () => {
    const target = mountFace({ card: CARD, ground: "#2A2340", elapsedMs: 0 });

    const text = await waitForText(target);
    expect(text.style.opacity).toBe("0");
  });
});
