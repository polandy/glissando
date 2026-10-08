import type { PictureLoader } from "../ports";

/** A decoded picture, drawable by both the WebGL and the DOM renderer. */
export interface BrowserPicture {
  readonly element: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

/** Loads and decodes pictures off the main thread before they are needed on screen. */
export class ImageElementLoader implements PictureLoader<BrowserPicture> {
  async load(src: string): Promise<BrowserPicture> {
    const element = new Image();
    element.decoding = "async";
    element.src = src;
    await element.decode();
    return { element, width: element.naturalWidth, height: element.naturalHeight };
  }

  release(picture: BrowserPicture): void {
    picture.element.removeAttribute("src");
  }
}
