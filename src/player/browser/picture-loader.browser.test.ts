import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "../create-player";
import { firstFrame, viewportBox } from "../testing/browser-pictures";
import {
  OPENED_PICTURE_SHOW,
  openingOnly,
  PICTURE_ID,
  PICTURE_SIZE,
  redPng,
} from "../testing/opened-pictures";
import { ImageElementLoader, type ObjectUrlPort } from "./picture-loader";

/** The browser's object URLs, with every created and revoked one on record. */
class RecordingUrls implements ObjectUrlPort {
  readonly created: string[] = [];
  readonly revoked: string[] = [];

  create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.created.push(url);
    return url;
  }

  revoke(url: string): void {
    this.revoked.push(url);
    URL.revokeObjectURL(url);
  }
}

let box: HTMLElement | null = null;
afterEach(() => box?.remove());

describe("ImageElementLoader with openPicture", () => {
  it("decodes the opened blob and revokes its object URL on release", async () => {
    const urls = new RecordingUrls();
    const loader = new ImageElementLoader({
      openPicture: openingOnly(PICTURE_ID, await redPng()),
      urls,
    });

    const picture = await loader.load(PICTURE_ID);
    expect(picture.width).toBe(PICTURE_SIZE);
    expect(urls.created).toHaveLength(1);
    expect(urls.revoked).toEqual([]);

    loader.release(picture);
    expect(urls.revoked).toEqual(urls.created);
  });

  it("revokes the object URL when the blob is no picture", async () => {
    const urls = new RecordingUrls();
    const loader = new ImageElementLoader({
      openPicture: openingOnly(PICTURE_ID, new Blob(["not a picture"], { type: "image/png" })),
      urls,
    });

    await expect(loader.load(PICTURE_ID)).rejects.toThrow();
    expect(urls.created).toHaveLength(1);
    expect(urls.revoked).toEqual(urls.created);
  });
});

describe("createPlayer with openPicture", () => {
  it("draws a picture opened by id in the DOM fallback", async () => {
    box = viewportBox({ width: 32, height: 32 });
    const player = createPlayer(box, OPENED_PICTURE_SHOW, {
      webGl2Context: () => null,
      openPicture: openingOnly(PICTURE_ID, await redPng()),
    });

    await firstFrame(player);

    const drawn = box.querySelector("img");
    expect(drawn?.src.startsWith("blob:")).toBe(true);
    expect(drawn?.naturalWidth).toBe(PICTURE_SIZE);
    player.destroy();
  });
});
