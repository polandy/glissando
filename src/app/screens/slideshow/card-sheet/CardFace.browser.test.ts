import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { Fonts } from "../../../../player/fonts";
import { FakeFonts } from "../../../../player/testing/fakes";
import type { Card } from "../../../../player/slideshow";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import { whenRendered } from "../../../testing/when-rendered";
import CardFace from "./CardFace.svelte";

const CARD: Card = {
  title: "Juli 2025",
  subtitle: "1.–14. Juli",
  style: "modern",
  position: "centre",
  ink: "light",
  entrance: "rise",
};

/** Hands every `load` its own promise, settled in call order by `settle`. */
class OrderedFonts implements Fonts {
  readonly #pending: (() => void)[] = [];

  load(): Promise<unknown> {
    return new Promise<void>((resolve) => this.#pending.push(resolve));
  }

  settle(count: number): void {
    this.#pending.splice(0, count).forEach((resolve) => resolve());
  }
}

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountFace(props: {
  card: Card;
  ground?: string;
  pictureUrl?: string;
  elapsedMs: number;
  reducedMotion?: boolean;
  fonts: Fonts;
}) {
  const mounted = mountWithTranslator(CardFace, props);
  mounted.target.style.width = "320px";
  mounted.target.style.height = "180px";
  destroy = mounted.destroy;
  return mounted.target;
}

describe("CardFace", () => {
  it("draws the card's title and subtitle once its fonts settle", async () => {
    const fonts = new FakeFonts();
    const target = mountFace({ card: CARD, ground: "#2A2340", elapsedMs: 5000, fonts });

    fonts.resolve();
    await whenRendered(target, ".text");

    expect(target.textContent).toContain("Juli 2025");
    expect(target.textContent).toContain("1.–14. Juli");
  });

  it("shows no text while its fonts have not settled yet", () => {
    const fonts = new FakeFonts();
    const target = mountFace({ card: CARD, ground: "#2A2340", elapsedMs: 5000, fonts });
    flushSync();

    expect(target.querySelector(".text")).toBeNull();
  });

  it("shows the ground colour, not a picture, for a colour background", () => {
    const target = mountFace({
      card: CARD,
      ground: "#8FD9C4",
      elapsedMs: 5000,
      fonts: new FakeFonts(),
    });

    const ground = target.querySelector<HTMLElement>(".ground");
    expect(ground?.style.background).toContain("rgb(143, 217, 196)");
    expect(target.querySelector(".picture")).toBeNull();
  });

  it("tints the veil over a picture background at the card's veil amount", () => {
    const withVeil: Card = { ...CARD, veil: { amount: 0.6, tint: "#2A2340" } };
    const target = mountFace({
      card: withVeil,
      pictureUrl: "pic.jpg",
      elapsedMs: 5000,
      fonts: new FakeFonts(),
    });

    const veil = target.querySelector<HTMLElement>(".veil");
    expect(veil).not.toBeNull();
    expect(target.querySelector(".picture")).not.toBeNull();
  });

  it("fades the text in over the card's own timing, not shown at once", async () => {
    const fonts = new FakeFonts();
    const target = mountFace({ card: CARD, ground: "#2A2340", elapsedMs: 0, fonts });

    fonts.resolve();
    const text = await whenRendered(target, ".text");

    expect((text as HTMLElement).style.opacity).toBe("0");
  });

  it("keeps the text hidden when a replaced style's fonts settle before the new style's", async () => {
    const fonts = new OrderedFonts();
    const props = reactiveProps({ card: CARD, ground: "#2A2340", elapsedMs: 5000, fonts });
    const target = mountFace(props);
    fonts.settle(2);
    await whenRendered(target, ".text");

    props.card = { ...CARD, style: "classic" };
    flushSync();
    props.card = { ...CARD, style: "bold" };
    flushSync();
    fonts.settle(2);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(target.querySelector(".text")).toBeNull();

    fonts.settle(2);
    await whenRendered(target, ".text");
  });
});
