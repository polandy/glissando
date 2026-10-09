import type { BitmapPicture } from "../browser/bitmap-loader";

/** Pixels uploaded by one `prepare` step: a few milliseconds of a frame in WebKit (ADR-0014). */
export const UPLOAD_PIXELS_PER_FRAME = 1_048_576;

interface PictureTexture {
  readonly texture: WebGLTexture;
  rowsUploaded: number;
  mipmapped: boolean;
}

/**
 * One texture per picture, with mipmaps so a 4K picture shrinks to the screen smoothly. It is
 * uploaded in steps (`prepareStep`): the storage with a first slice of rows, one slice per later
 * step, then the mipmaps in a step of their own. `texture` finishes whatever is left at once.
 */
export class PictureTextures {
  readonly #gl: WebGL2RenderingContext;
  readonly #textures = new Map<BitmapPicture, PictureTexture>();

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
  }

  isComplete(picture: BitmapPicture): boolean {
    return this.#textures.get(picture)?.mipmapped ?? false;
  }

  /** Does the next bounded step of the upload, if any is left. */
  prepareStep(picture: BitmapPicture): void {
    const entry = this.#entry(picture);
    if (entry.rowsUploaded < picture.height) {
      this.#uploadRows(picture, entry, rowsPerSlice(picture));
    } else if (!entry.mipmapped) {
      this.#generateMipmap(entry);
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

  forget(picture: BitmapPicture): void {
    const entry = this.#textures.get(picture);
    if (entry !== undefined) {
      this.#gl.deleteTexture(entry.texture);
      this.#textures.delete(picture);
    }
  }

  /** The context was restored: every texture is gone with the old one and is uploaded anew. */
  recreate(): void {
    this.#textures.clear();
  }

  dispose(): void {
    this.#textures.forEach(({ texture }) => this.#gl.deleteTexture(texture));
    this.#textures.clear();
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
    const entry = { texture, rowsUploaded: 0, mipmapped: false };
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

function rowsPerSlice({ width }: BitmapPicture): number {
  return Math.max(1, Math.floor(UPLOAD_PIXELS_PER_FRAME / width));
}

function mipLevels({ width, height }: BitmapPicture): number {
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}
