import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import FrameCard from "./FrameCard.svelte";

let destroy = () => {};
afterEach(() => destroy());

describe("FrameCard", () => {
  it("calls onSetUp when its button is pressed", () => {
    let setUps = 0;
    const mounted = mountWithTranslator(FrameCard, { onSetUp: () => (setUps += 1) });
    destroy = mounted.destroy;

    mounted.target.querySelector<HTMLButtonElement>("button")?.click();

    expect(setUps).toBe(1);
  });
});
