import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredCard } from "../../../../library/stored-slideshow";
import { FakeClock, FakeFonts, FakeFrameScheduler } from "../../../../player/testing/fakes";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { whenRendered } from "../../../testing/when-rendered";
import type { PictureTile } from "../../view-models";
import { CARD_PREVIEW_SETTLED_MS } from "./card-preview-model";
import CardPreview from "./CardPreview.svelte";

const CARD: StoredCard = {
  title: "Juli 2025",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
  motion: true,
};

const PICTURES: PictureTile[] = [
  {
    id: "a",
    thumbnailUrl: "a.jpg",
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  },
];

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(reducedMotion = false) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const fonts = new FakeFonts();
  const props = reactiveProps<{
    card: StoredCard;
    pictures: readonly PictureTile[];
    previewPorts: { clock: FakeClock; frames: FakeFrameScheduler };
    reducedMotion: boolean;
    fonts: FakeFonts;
  }>({ card: CARD, pictures: PICTURES, previewPorts: { clock, frames }, reducedMotion, fonts });
  const mounted = mountWithTranslator(CardPreview, props);
  mounted.target.style.width = "320px";
  destroy = mounted.destroy;
  const after = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
  };
  return { target: mounted.target, props, after, fonts };
}

async function settledText(target: HTMLElement, fonts: FakeFonts): Promise<HTMLElement> {
  fonts.resolve();
  return (await whenRendered(target, ".text")) as HTMLElement;
}

describe("CardPreview", () => {
  it("shows a Play button", async () => {
    const { target, fonts } = setUp();
    await settledText(target, fonts);

    expect(target.querySelector("button.play")?.textContent).toContain("Abspielen");
  });

  it("shows no text while its fonts have not settled yet", () => {
    const { target } = setUp();
    flushSync();

    expect(target.querySelector(".text")).toBeNull();
  });

  it("plays its enter phase once mounted, settling once given the time", async () => {
    const { target, after, fonts } = setUp();
    const text = await settledText(target, fonts);
    expect(text.style.opacity).toBe("0");

    after(CARD_PREVIEW_SETTLED_MS);
    flushSync();

    expect(text.style.opacity).toBe("1");
  });

  it("shows the settled state at once under reduced motion, without ticking", async () => {
    const { target, fonts } = setUp(true);

    const text = await settledText(target, fonts);
    expect(text.style.opacity).toBe("1");
  });

  it("jumps an edit straight to the settled state, never replayed from zero", async () => {
    const { target, props, after, fonts } = setUp();
    const text = await settledText(target, fonts);
    after(CARD_PREVIEW_SETTLED_MS);
    flushSync();
    expect(text.style.opacity).toBe("1");

    props.card = { ...CARD, title: "Juli am See" };
    flushSync();

    expect(target.textContent).toContain("Juli am See");
    expect(text.style.opacity).toBe("1");
  });

  it("disables Play while it runs, re-enabling it once settled again", async () => {
    const { target, after, fonts } = setUp();
    await settledText(target, fonts);
    after(CARD_PREVIEW_SETTLED_MS);
    flushSync();
    const button = target.querySelector<HTMLButtonElement>("button.play");

    button?.click();
    flushSync();
    expect(button?.disabled).toBe(true);

    after(5000);
    flushSync();
    expect(button?.disabled).toBe(false);
  });
});
