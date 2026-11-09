import type { Size } from "../import/downscale";

/** Scales a picture down to exactly `size` and encodes it as JPEG. */
export interface PictureScaler {
  scale(picture: Blob, size: Size, quality: number): Promise<Blob>;
}

/** Where the page goes, in order; a picked file is streamed, so the page is never held whole. */
export interface PageSink {
  write(text: string): Promise<void>;
  /** Finishes the file. */
  close(): Promise<void>;
  /** Drops what was written: after a failure or a cancel. */
  abort(): Promise<void>;
}

/** A third-party npm package bundled into the page's script, named in the page head (ADR-0015). */
export interface BundledNotice {
  readonly name: string;
  readonly version: string;
  /** SPDX id, e.g. "MPL-2.0". */
  readonly licenseId: string;
  /** Where its source is, e.g. its GitHub repository. */
  readonly sourceUrl: string;
}

/** The export player's built parts, as `build/export-player-plugin.ts` provides them. */
export interface PlayerBundle {
  /** The page's script, with the decode worker inside. */
  readonly script: string;
  /** The page's CSS, design tokens included. */
  readonly style: string;
  /** The caption font as a `data:font/woff2;base64,…` URL. */
  readonly captionFontDataUrl: string;
  /** Every card font beyond the caption font, by its asset path, as `data:` URLs (ADR-0032); a
   * page embeds only the ones its own cards use (`cardFontFilesUsedBy`). */
  readonly cardFontDataUrls: Readonly<Record<string, string>>;
  /** The npm packages the script bundles, for the page head. */
  readonly notices: readonly BundledNotice[];
}

/** Loads the player bundle; the app loads it on the first export. */
export interface PlayerAsset {
  load(): Promise<PlayerBundle>;
}
