import { afterEach, describe, expect, it } from "vitest";
import { RED, solidBitmap, standingStill, viewportBox } from "../testing/browser-pictures";
import { WebGlRenderer } from "./webgl-renderer";

/** A square picture on this screen hides more than a third of itself covering: blurred fill. */
const SCREEN = { width: 160, height: 90 };
/** The picture's own texture and its blurred backdrop. */
const BLURRED_FILL_TEXTURES = 2;

let box: HTMLElement;
afterEach(() => box.remove());

/** A renderer whose context records every texture it creates and deletes. */
function setUp() {
  box = viewportBox(SCREEN);
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
  return { renderer, created, deleted };
}

describe("WebGlRenderer.forget, a blurred fill (ADR-0028)", () => {
  it("deletes the picture's backdrop texture along with its own", async () => {
    const { renderer, created, deleted } = setUp();
    const picture = await solidBitmap(RED);
    const motion = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
    renderer.render({ kind: "slide", slide: { picture, motion } });
    expect(created).toHaveLength(BLURRED_FILL_TEXTURES);

    renderer.forget(picture);

    // By identity: WebGL objects have no fields, so a deep comparison holds any two equal.
    const kept = created.filter((texture) => !deleted.includes(texture));
    expect(kept).toHaveLength(0);
  });
});
