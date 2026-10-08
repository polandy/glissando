import type { PictureLoader } from "../ports";

/** A decoded picture, drawable by both the WebGL and the DOM renderer. */
export interface BrowserPicture {
  readonly element: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

/** Reads a picture's bytes for a slide's `image.src`, e.g. from local storage by media id. */
export type OpenPicture = (src: string) => Promise<Blob>;

export interface ObjectUrlPort {
  create(blob: Blob): string;
  revoke(url: string): void;
}

/** Where pictures come from when a slide's `src` is no URL the browser can load itself. */
export interface PictureSource {
  readonly openPicture: OpenPicture;
  readonly urls: ObjectUrlPort;
}

/**
 * Loads and decodes pictures off the main thread before they are needed on screen. With a
 * `PictureSource`, each picture's bytes are read only when it is loaded and its object URL lives
 * until it is released, so a long slideshow holds just the buffered pictures.
 */
export class ImageElementLoader implements PictureLoader<BrowserPicture> {
  readonly #source: PictureSource | null;
  readonly #objectUrls = new WeakMap<HTMLImageElement, string>();

  constructor(source: PictureSource | null = null) {
    this.#source = source;
  }

  async load(src: string): Promise<BrowserPicture> {
    const element = new Image();
    element.decoding = "async";
    if (this.#source === null) {
      element.src = src;
      await element.decode();
    } else {
      const url = this.#source.urls.create(await this.#source.openPicture(src));
      this.#objectUrls.set(element, url);
      element.src = url;
      try {
        await element.decode();
      } catch (error) {
        this.#revoke(element);
        throw error;
      }
    }
    return { element, width: element.naturalWidth, height: element.naturalHeight };
  }

  release(picture: BrowserPicture): void {
    picture.element.removeAttribute("src");
    this.#revoke(picture.element);
  }

  #revoke(element: HTMLImageElement): void {
    const url = this.#objectUrls.get(element);
    if (url !== undefined) {
      this.#objectUrls.delete(element);
      this.#source?.urls.revoke(url);
    }
  }
}
