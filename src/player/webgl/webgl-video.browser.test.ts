import { afterEach, describe, expect, it } from "vitest";
import type { PixelPicture } from "../browser/pixel-loader";
import type { LiveFrame, RenderFrame } from "../ports";
import {
  BLUE,
  GREEN,
  RED,
  WHITE,
  quadrantCanvas,
  repaint,
  solidPixels,
  solidPixelsOfSize,
  solidCanvas,
  standingStill,
  viewportBox,
  type Rgb,
} from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";
// 1 s of ffmpeg's test pattern at 64×48; see video-clip.browser.test.ts.
import testPatternUrl from "../../import/testing/video/audio-outlasts-picture.webm?url";

const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
const SCREEN = { width: 160, height: 90 };
/** A picture's colour darkened as the blurred fill's backdrop (ADR-0028). */
const BACKDROP_BRIGHTNESS = 0.55;
const COLOUR_TOLERANCE = 10;
/** The live frame's texture, besides the poster's texture and its backdrop. */
const TEXTURES_OF_A_LIVE_SLIDE = 3;

let box: HTMLElement;
afterEach(() => box.remove());

function setUp(viewport = SCREEN) {
  box = viewportBox(viewport);
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
  box.append(canvas);
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (gl === null) {
    throw new Error("this browser has no WebGL2");
  }
  const renderer = new WebGlRenderer(canvas, gl, () => undefined, { pixelRatio: () => 1 });
  const created: WebGLTexture[] = [];
  const deleted: (WebGLTexture | null)[] = [];
  const createTexture = gl.createTexture.bind(gl);
  gl.createTexture = () => {
    const texture = createTexture();
    created.push(texture);
    return texture;
  };
  const deleteTexture = gl.deleteTexture.bind(gl);
  gl.deleteTexture = (texture) => {
    deleted.push(texture);
    deleteTexture(texture);
  };
  const videoUploads: TexImageSource[] = [];
  const texImage2D = gl.texImage2D.bind(gl) as (...args: unknown[]) => void;
  gl.texImage2D = ((...args: unknown[]) => {
    const source = args.at(-1);
    if (source instanceof HTMLVideoElement) {
      videoUploads.push(source);
    }
    texImage2D(...args);
  }) as typeof gl.texImage2D;
  const frameOf = (poster: PixelPicture, live?: LiveFrame): RenderFrame<PixelPicture> => ({
    kind: "slide",
    endFade: 0,
    look: "none",
    slide: {
      kind: "picture",
      picture: poster,
      motion: STILL,
      ...(live === undefined ? {} : { live }),
    },
  });
  const drawAndRead = (
    frame: RenderFrame<PixelPicture>,
    xFromLeft: number,
    yFromTop: number,
  ): Rgb => {
    renderer.render(frame);
    const pixel = new Uint8Array(4);
    gl.readPixels(
      Math.floor(xFromLeft * canvas.width),
      Math.floor((1 - yFromTop) * canvas.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  };
  return { renderer, frameOf, drawAndRead, created, deleted, videoUploads };
}

/** The test pattern, paused at `atSeconds` with that frame decoded. */
async function pausedClip(atSeconds: number): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.src = testPatternUrl;
  await new Promise((resolve) => video.addEventListener("loadeddata", resolve, { once: true }));
  await seekTo(video, atSeconds);
  return video;
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<Event> {
  const seeked = new Promise<Event>((resolve) =>
    video.addEventListener("seeked", resolve, { once: true }),
  );
  video.currentTime = seconds;
  return seeked;
}

function isColour(actual: Rgb, expected: Rgb): boolean {
  return actual.every(
    (channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= COLOUR_TOLERANCE,
  );
}

describe("WebGlRenderer: video slides (ADR-0035)", () => {
  it("draws the poster while the layer has no live frame", async () => {
    const { frameOf, drawAndRead } = setUp();
    const poster = solidPixels(RED);
    expect(drawAndRead(frameOf(poster), 0.5, 0.5)).toEqual(RED);
  });

  it("draws the live frame in place of the poster", async () => {
    const { frameOf, drawAndRead } = setUp();
    const poster = solidPixels(RED);
    expect(drawAndRead(frameOf(poster, solidCanvas(BLUE)), 0.5, 0.5)).toEqual(BLUE);
  });

  it("draws the live frame the right way up", async () => {
    const { frameOf, drawAndRead } = setUp();
    const poster = solidPixelsOfSize(RED, SCREEN);
    const frame = frameOf(poster, quadrantCanvas());
    expect(drawAndRead(frame, 0.1, 0.1)).toEqual(RED);
    expect(drawAndRead(frame, 0.9, 0.1)).toEqual(GREEN);
    expect(drawAndRead(frame, 0.1, 0.9)).toEqual(BLUE);
    expect(drawAndRead(frame, 0.9, 0.9)).toEqual(WHITE);
  });

  it("uploads the live source again for every frame drawn", async () => {
    const { frameOf, drawAndRead } = setUp();
    const poster = solidPixels(RED);
    const live = solidCanvas(BLUE);
    const frame = frameOf(poster, live);
    expect(drawAndRead(frame, 0.5, 0.5)).toEqual(BLUE);
    repaint(live, GREEN);
    expect(drawAndRead(frame, 0.5, 0.5)).toEqual(GREEN);
  });

  it("uploads a paused clip's frame once however often it is drawn, and again after a seek", async () => {
    const { frameOf, drawAndRead, videoUploads } = setUp();
    const poster = solidPixels(RED);
    const clip = await pausedClip(0.2);
    const frame = frameOf(poster, clip);
    const DRAWS = 10;
    for (let draw = 0; draw < DRAWS; draw += 1) {
      drawAndRead(frame, 0.5, 0.5);
    }
    expect(videoUploads).toHaveLength(1);

    await seekTo(clip, 0.6);
    drawAndRead(frame, 0.5, 0.5);
    drawAndRead(frame, 0.5, 0.5);

    expect(videoUploads).toHaveLength(2);
  });

  it("goes back to the poster when the live frame is gone", async () => {
    const { frameOf, drawAndRead } = setUp();
    const poster = solidPixels(RED);
    expect(drawAndRead(frameOf(poster, solidCanvas(BLUE)), 0.5, 0.5)).toEqual(BLUE);
    expect(drawAndRead(frameOf(poster), 0.5, 0.5)).toEqual(RED);
  });

  it("keeps the blurred fill of a portrait clip from its poster, the live frame in front", async () => {
    const { frameOf, drawAndRead } = setUp({ width: 1920, height: 1080 });
    const poster = solidPixelsOfSize(RED, { width: 300, height: 400 });
    const frame = frameOf(poster, solidCanvas(BLUE));
    expect(drawAndRead(frame, 0.5, 0.5)).toEqual(BLUE);
    const side = drawAndRead(frame, 0.02, 0.5);
    expect(
      isColour(side, RED.map((channel) => channel * BACKDROP_BRIGHTNESS) as unknown as Rgb),
    ).toBe(true);
  });

  it("deletes the live texture with the poster's when the slide is forgotten", async () => {
    const { renderer, frameOf, drawAndRead, created, deleted } = setUp();
    const poster = solidPixels(RED);
    drawAndRead(frameOf(poster, solidCanvas(BLUE)), 0.5, 0.5);
    expect(created).toHaveLength(TEXTURES_OF_A_LIVE_SLIDE);

    renderer.forget(poster);

    expect(created.filter((texture) => !deleted.includes(texture))).toHaveLength(0);
  });
});
