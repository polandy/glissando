import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  buttonNamed,
  click,
  mountScreen,
  press,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";
import { findButtonNamed } from "../testing/by-role";

afterEach(() => unmountScreen());

const PLAY_FROM_HERE = "Ab hier abspielen";

describe("SlideshowScreen, play from a chosen picture", () => {
  it("offers Play from here for exactly one selected picture and plays from it", () => {
    const { calls } = mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();

    const item = selectionBar()?.querySelector<HTMLButtonElement>(
      `button[aria-label="${PLAY_FROM_HERE}"]`,
    );
    item?.click();

    expect(calls.playedFrom).toEqual(["b"]);
  });

  it("does not offer it when several pictures are selected", () => {
    mountScreen();
    tile(1, "01.07.2025").click();
    click(tile(2, "02.07.2025"), { ctrlKey: true });

    const bar = selectionBar();
    expect(bar?.textContent).toContain("2 ausgewählt");
    expect(bar !== null && findButtonNamed(bar, PLAY_FROM_HERE) !== undefined).toBe(false);
  });

  it("plays from the picture shown in the full-screen viewer", () => {
    const { calls } = mountScreen();
    press(tile(2, "02.07.2025"), "f");

    buttonNamed(PLAY_FROM_HERE).click();

    expect(calls.playedFrom).toEqual(["b"]);
  });
});
