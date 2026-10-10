import { ImmichBrowser, type ImmichBrowserOptions } from "./immich-browser";

/**
 * One Immich browser per picture intake (a new slideshow's or an adding's), so its selection
 * and lists live exactly as long as the intake they feed.
 */
export class ImmichBrowsers {
  readonly #options: ImmichBrowserOptions;
  readonly #browsers = new WeakMap<object, ImmichBrowser>();

  constructor(options: ImmichBrowserOptions) {
    this.#options = options;
  }

  for(intake: object): ImmichBrowser {
    let browser = this.#browsers.get(intake);
    if (browser === undefined) {
      browser = new ImmichBrowser(this.#options);
      this.#browsers.set(intake, browser);
    }
    return browser;
  }
}
