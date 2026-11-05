import "../../styles/tokens.css";
import { afterEach, describe, expect, it } from "vitest";
import { separatorRoom } from "../testing/separator-room";
import { mountWithTranslator } from "../testing/mount-with-translator";
import Separator from "./Separator.svelte";

/** Room the "·" gets on both sides together beyond the font's narrow spaces, in CSS pixels. */
const SEPARATOR_MIN_ROOM_PX = 6;

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

describe("Separator", () => {
  it("is a spaced dot with room on both sides", () => {
    const mounted = mountWithTranslator(Separator, {});
    destroy = mounted.destroy;

    const separator = mounted.target.querySelector<HTMLElement>(".separator");
    if (separator === null) throw new Error("no separator");
    expect(separator.textContent).toBe(" · ");
    expect(separatorRoom(separator)).toBeGreaterThanOrEqual(SEPARATOR_MIN_ROOM_PX);
  });
});
