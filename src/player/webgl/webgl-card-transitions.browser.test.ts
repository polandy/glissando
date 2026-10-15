import { afterEach, describe, expect, it } from "vitest";
import type { BitmapPicture } from "../browser/bitmap-loader";
import { CARD_STYLE_SPECS, layoutCard } from "../card-layout";
import { cardItemSlices } from "../card-item-layout";
import { canvasCardMeasure } from "../card-measure";
import type { PictureSlideLayer, RenderFrame } from "../ports";
import { BLUE, solidBitmap, standingStill } from "../testing/browser-pictures";
import {
  baseCard,
  cardVisual,
  groundLayer,
  maxBrightnessInColumns,
  setUpCardRenderer,
  VIEWPORT,
  WHOLE_PICTURE,
} from "./testing/card-render-fixtures";

let box: HTMLElement;
afterEach(() => box.remove());

describe("WebGlRenderer title cards under a transition", () => {
  it("wipes a card with its outgoing slide, never bleeding onto the incoming side", async () => {
    const { renderer, box: stage, readAllPixels } = setUpCardRenderer();
    box = stage;
    await renderer.cardFontLoaded("modern");
    const picture = await solidBitmap(BLUE);
    const to: PictureSlideLayer<BitmapPicture> = {
      kind: "picture",
      picture,
      motion: standingStill(WHOLE_PICTURE),
    };
    const card = baseCard({ title: "Summer Lake", entrance: "words" });
    const from = groundLayer(
      cardVisual(card, { textOpacity: 1, slideTimeMs: 1000, reducedMotion: true }),
    );
    // The two words' own slices (as the stagger test in `webgl-cards.browser.test.ts`), each
    // clipped clear of the wipe's own moving (soft) edge at the stage's centre, so a sampled
    // column sits squarely inside one word's ink regardless of exactly where the font breaks
    // lines between letters.
    const measureTitle = canvasCardMeasure(CARD_STYLE_SPECS.modern.title, VIEWPORT);
    const measureSubtitle = canvasCardMeasure(CARD_STYLE_SPECS.modern.subtitle, VIEWPORT);
    const layout = layoutCard(card, VIEWPORT, measureTitle, measureSubtitle);
    const [firstWord, lastWord] = cardItemSlices(
      card,
      layout,
      VIEWPORT,
      measureTitle,
      measureSubtitle,
    );
    if (firstWord === undefined || lastWord === undefined) {
      throw new Error("expected two word slices for a two-word title");
    }
    const wipeBoundary = VIEWPORT.width / 2;
    const wipeSoftEdge = 0.04 * VIEWPORT.height;
    const incomingStart = Math.round(firstWord.x);
    const incomingEnd = Math.round(
      Math.min(firstWord.x + firstWord.width, wipeBoundary - wipeSoftEdge),
    );
    const outgoingStart = Math.round(Math.max(lastWord.x, wipeBoundary + wipeSoftEdge));
    const outgoingEnd = Math.round(lastWord.x + lastWord.width);
    if (incomingEnd <= incomingStart || outgoingEnd <= outgoingStart) {
      throw new Error("expected each word to have a safe margin clear of the wipe's own edge");
    }
    const frame: RenderFrame<BitmapPicture> = {
      kind: "transition",
      effect: "wipe-right",
      progress: 0.5,
      from,
      to,
      endFade: 0,
    };

    const pixels = readAllPixels(frame);
    const incomingBrightness = maxBrightnessInColumns(
      pixels,
      VIEWPORT.width,
      incomingStart,
      incomingEnd,
    );
    const outgoingBrightness = maxBrightnessInColumns(
      pixels,
      VIEWPORT.width,
      outgoingStart,
      outgoingEnd,
    );

    // "wipe-right" has already revealed the incoming (to) slide's plain blue there at progress
    // 0.5: the outgoing slide's card must not still show through (ADR-0032 — a card is carried
    // by its own slide's transition, not an overlay independent of it).
    expect(incomingBrightness).toBeLessThanOrEqual(BLUE[2] + 8);
    // The outgoing (from) slide's own half still shows its card, bright against the dark ground.
    expect(outgoingBrightness).toBeGreaterThan(400);
  });
});
