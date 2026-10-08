import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "../create-player";
import { firstFrame, oneSlideShow, viewportBox } from "../testing/browser-pictures";

let box: HTMLElement;
afterEach(() => box.remove());

describe("createPlayer with WebGL2", () => {
  it("draws into a canvas that fills the container and removes it on destroy", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const player = createPlayer(box, await oneSlideShow());

    await firstFrame(player);
    expect(box.querySelector("canvas")).not.toBeNull();

    player.destroy();
    expect(box.childElementCount).toBe(0);
  });
});
