import { ImmichBrowser, type ImmichBrowserOptions } from "./immich-browser";

/**
 * One Immich browser per picture intake (a new slideshow's or an adding's), so its selection
 * and lists live exactly as long as the intake they feed. A browser lists videos only for a
 * device slideshow, so one per kind of listing.
 */
export class ImmichBrowsers {
  readonly #options: Omit<ImmichBrowserOptions, "withVideos">;
  readonly #photosOnly = new WeakMap<object, ImmichBrowser>();
  readonly #withVideos = new WeakMap<object, ImmichBrowser>();

  constructor(options: Omit<ImmichBrowserOptions, "withVideos">) {
    this.#options = options;
  }

  for(intake: object, withVideos: boolean): ImmichBrowser {
    const browsers = withVideos ? this.#withVideos : this.#photosOnly;
    let browser = browsers.get(intake);
    if (browser === undefined) {
      browser = new ImmichBrowser({ ...this.#options, withVideos });
      browsers.set(intake, browser);
    }
    return browser;
  }
}
