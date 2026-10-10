import type { Size } from "../../import/downscale";
import type { PageSink, PictureScaler, PlayerAsset, PlayerBundle } from "../ports";

export const FAKE_BUNDLE: PlayerBundle = {
  script: "startPage()",
  style: "body{margin:0}",
  captionFontDataUrl: "data:font/woff2;base64,AAAA",
};

export function fixedPlayerAsset(bundle: PlayerBundle = FAKE_BUNDLE): PlayerAsset {
  return { load: () => Promise.resolve(bundle) };
}

export interface ScaleCall {
  readonly text: string;
  readonly size: Size;
  readonly quality: number;
}

/** Scales by writing the target size into the bytes: "scaled 1280x720 from <original>". */
export class FakeScaler implements PictureScaler {
  readonly calls: ScaleCall[] = [];

  async scale(picture: Blob, size: Size, quality: number): Promise<Blob> {
    const text = await picture.text();
    this.calls.push({ text, size, quality });
    return new Blob([`scaled ${size.width}x${size.height} from ${text}`], { type: "image/jpeg" });
  }
}

/** Collects the page as one string. */
export class MemoryPageSink implements PageSink {
  readonly writes: string[] = [];
  closed = false;
  aborted = false;
  /** Called before every write, e.g. to abort mid-run. */
  beforeWrite: (text: string) => void = () => undefined;

  get text(): string {
    return this.writes.join("");
  }

  write(text: string): Promise<void> {
    if (this.closed || this.aborted) {
      return Promise.reject(new Error("write after the sink was closed or aborted"));
    }
    this.beforeWrite(text);
    this.writes.push(text);
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  abort(): Promise<void> {
    this.aborted = true;
    return Promise.resolve();
  }
}
