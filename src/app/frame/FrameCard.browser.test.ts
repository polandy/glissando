import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import FrameCard from "./FrameCard.svelte";
import { findButtonNamed } from "../testing/by-role";

let destroy = () => {};
afterEach(() => destroy());

function mountCard() {
  let setUps = 0;
  let hides = 0;
  const mounted = mountWithTranslator(FrameCard, {
    onSetUp: () => (setUps += 1),
    onHide: () => (hides += 1),
  });
  destroy = mounted.destroy;
  const button = (name: string) => findButtonNamed(mounted.target, name);
  return { button, setUps: () => setUps, hides: () => hides };
}

describe("FrameCard", () => {
  it("calls onSetUp when its set-up button is pressed", () => {
    const card = mountCard();

    card.button("Einrichten")?.click();

    expect(card.setUps()).toBe(1);
    expect(card.hides()).toBe(0);
  });

  it("calls onHide when its close button is pressed", () => {
    const card = mountCard();

    card.button("Bilderrahmen-Karte ausblenden")?.click();

    expect(card.hides()).toBe(1);
    expect(card.setUps()).toBe(0);
  });
});
