import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "./create-player";
import { oneSlideShow, firstFrame, viewportBox } from "./testing/browser-pictures";

let box: HTMLElement;
afterEach(() => box.remove());

describe("createPlayer", () => {
  it("falls back to the DOM renderer when the browser has no WebGL2", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const player = createPlayer(box, await oneSlideShow(), () => null);

    await firstFrame(player);

    expect(box.querySelector("img")).not.toBeNull();
    expect(box.querySelector("canvas")).toBeNull();
    player.destroy();
  });
});
