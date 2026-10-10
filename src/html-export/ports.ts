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

/** The export player's built parts, as `build/export-player-plugin.ts` provides them. */
export interface PlayerBundle {
  /** The page's script, with the decode worker inside. */
  readonly script: string;
  /** The page's CSS, design tokens included. */
  readonly style: string;
  /** The caption font as a `data:font/woff2;base64,…` URL. */
  readonly captionFontDataUrl: string;
}

/** Loads the player bundle; the app loads it on the first export. */
export interface PlayerAsset {
  load(): Promise<PlayerBundle>;
}
