import type { BitmapPicture } from "../browser/bitmap-loader";
import type { LiveFrame } from "../ports";
import { createBackdropTexture } from "./backdrop-texture";
import { setLinearClamped } from "./caption-textures";

/** Pixels uploaded by one `prepare` step: a few milliseconds of a frame in WebKit (ADR-0014). */
export const UPLOAD_PIXELS_PER_FRAME = 1_048_576;

/** A ground layer's colour comes from a uniform, not a texture; its sampler units still need a
 * complete texture bound, so every layer binds one of these (ADR-0032). */
const PLACEHOLDER_PIXEL = new Uint8Array([0, 0, 0, 255]);

interface PictureTexture {
  readonly texture: WebGLTexture;
  rowsUploaded: number;
  mipmapped: boolean;
  /** The blurred fill's backdrop, made in a step after the mipmaps. */
  backdrop: WebGLTexture | null;
}

interface LiveTexture {
  readonly texture: WebGLTexture;
  /** The `beginFrame` count it was last uploaded in, so a layer drawn twice uploads once. */
  uploadedInFrame: number;
}

/**
 * One texture per picture, with mipmaps so a 4K picture shrinks to the screen smoothly, and a
 * small blurred backdrop texture for the blurred fill (`backdrop-texture.ts`). They are uploaded
 * in steps (`prepareStep`): the storage with a first slice of rows, one slice per later step,
 * the mipmaps in a step of their own, then the backdrop. `texture` and `backdrop` finish
 * whatever their texture still lacks at once. A video slide's clip frame has a texture of its
 * own, keyed by the slide's poster picture and uploaded anew every frame (`live`): without
 * mipmaps, which a texture replaced 30 times a second cannot afford.
 */
export class PictureTextures {
  readonly #gl: WebGL2RenderingContext;
  readonly #textures = new Map<BitmapPicture, PictureTexture>();
  readonly #live = new Map<BitmapPicture, LiveTexture>();
  #frame = 0;
  #placeholder: WebGLTexture;

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
    this.#placeholder = createPlaceholder(gl);
  }

  /** The 1x1 texture a ground layer's unused picture/partner/backdrop samplers bind to. */
  placeholder(): WebGLTexture {
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#placeholder);
    return this.#placeholder;
  }

  isComplete(picture: BitmapPicture): boolean {
    return (this.#textures.get(picture)?.backdrop ?? null) !== null;
  }

  /** Does the next bounded step of the upload, if any is left. */
  prepareStep(picture: BitmapPicture): void {
    const entry = this.#entry(picture);
    if (entry.rowsUploaded < picture.height) {
      this.#uploadRows(picture, entry, rowsPerSlice(picture));
    } else if (!entry.mipmapped) {
      this.#generateMipmap(entry);
    } else if (entry.backdrop === null) {
      entry.backdrop = createBackdropTexture(this.#gl, picture);
    }
  }

  /** The picture's complete texture, bound to the active unit. */
  texture(picture: BitmapPicture): WebGLTexture {
    const entry = this.#entry(picture);
    if (entry.rowsUploaded < picture.height) {
      this.#uploadRows(picture, entry, picture.height - entry.rowsUploaded);
    }
    if (!entry.mipmapped) {
      this.#generateMipmap(entry);
    }
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, entry.texture);
    return entry.texture;
  }

  /** Starts a drawn frame, in which each live texture is uploaded at most once. */
  beginFrame(): void {
    this.#frame += 1;
  }

  /** The clip's current `frame` as the texture standing for `poster`, bound to the active unit. */
  live(poster: BitmapPicture, frame: LiveFrame): WebGLTexture {
    const gl = this.#gl;
    const entry = this.#liveEntry(poster);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    if (entry.uploadedInFrame !== this.#frame) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
      entry.uploadedInFrame = this.#frame;
    }
    return entry.texture;
  }

  /** The picture's blurred backdrop texture, bound to the active unit. */
  backdrop(picture: BitmapPicture): WebGLTexture {
    const entry = this.#entry(picture);
    entry.backdrop ??= createBackdropTexture(this.#gl, picture);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, entry.backdrop);
    return entry.backdrop;
  }

  forget(picture: BitmapPicture): void {
    const entry = this.#textures.get(picture);
    if (entry !== undefined) {
      this.#gl.deleteTexture(entry.texture);
      this.#gl.deleteTexture(entry.backdrop);
      this.#textures.delete(picture);
    }
    const live = this.#live.get(picture);
    if (live !== undefined) {
      this.#gl.deleteTexture(live.texture);
      this.#live.delete(picture);
    }
  }

  /** The context was restored: every texture is gone with the old one and is uploaded anew. */
  recreate(): void {
    this.#textures.clear();
    this.#live.clear();
    this.#placeholder = createPlaceholder(this.#gl);
  }

  dispose(): void {
    this.#textures.forEach(({ texture, backdrop }) => {
      this.#gl.deleteTexture(texture);
      this.#gl.deleteTexture(backdrop);
    });
    this.#textures.clear();
    this.#live.forEach(({ texture }) => this.#gl.deleteTexture(texture));
    this.#live.clear();
    this.#gl.deleteTexture(this.#placeholder);
  }

  #liveEntry(poster: BitmapPicture): LiveTexture {
    const existing = this.#live.get(poster);
    if (existing !== undefined) {
      return existing;
    }
    const gl = this.#gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    setLinearClamped(gl);
    const entry = { texture, uploadedInFrame: -1 };
    this.#live.set(poster, entry);
    return entry;
  }

  /** The picture's texture, its storage allocated for the whole mip chain on first use. */
  #entry(picture: BitmapPicture): PictureTexture {
    const existing = this.#textures.get(picture);
    if (existing !== undefined) {
      return existing;
    }
    const gl = this.#gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, mipLevels(picture), gl.RGBA8, picture.width, picture.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const entry: PictureTexture = { texture, rowsUploaded: 0, mipmapped: false, backdrop: null };
    this.#textures.set(picture, entry);
    return entry;
  }

  #uploadRows(picture: BitmapPicture, entry: PictureTexture, rows: number): void {
    const gl = this.#gl;
    const top = entry.rowsUploaded;
    const height = Math.min(rows, picture.height - top);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, top);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      top,
      picture.width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      picture.bitmap,
    );
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    entry.rowsUploaded = top + height;
  }

  #generateMipmap(entry: PictureTexture): void {
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, entry.texture);
    this.#gl.generateMipmap(this.#gl.TEXTURE_2D);
    entry.mipmapped = true;
  }
}

function createPlaceholder(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, PLACEHOLDER_PIXEL);
  setLinearClamped(gl);
  return texture;
}

function rowsPerSlice({ width }: BitmapPicture): number {
  return Math.max(1, Math.floor(UPLOAD_PIXELS_PER_FRAME / width));
}

function mipLevels({ width, height }: BitmapPicture): number {
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}
