import { decodeBase64 } from "../html-export/base64";
import {
  COPY_BLOCK_ID,
  MUSIC_KEY,
  PAGE_COPY_KEYS,
  SLIDESHOW_BLOCK_ID,
  type PageCopy,
} from "../html-export/page-contract";
import type { OpenPicture, Slideshow } from "../player";
// Deep, not the engine's index: the index brings in `createPlayer` and its worker file.
import { parseSlideshow } from "../player/parse-slideshow";

/** A `<script>` data block: its text and its `data-type`, if any. */
export interface PageBlock {
  readonly text: string;
  readonly mimeType: string | null;
}

/** Reads the block with `id`; null when the page has none. */
export type ReadBlock = (id: string) => PageBlock | null;

/** A page whose data blocks are missing or broken. */
export class PageDataError extends Error {
  override readonly name = "PageDataError";
}

export interface PageData {
  readonly slideshow: Slideshow;
  readonly copy: PageCopy;
  /** Unpacks a picture only when the player asks for it. */
  readonly openPicture: OpenPicture;
  /** Null when the slideshow has no music. */
  readonly music: Blob | null;
}

/** Reads the exported page's data blocks (dev-docs/HTML_EXPORT.md, "The page"). */
export function readPageData(read: ReadBlock): PageData {
  const slideshow = parseSlideshow(parseJson(read, SLIDESHOW_BLOCK_ID));
  const copy = readCopy(parseJson(read, COPY_BLOCK_ID));
  const media = (key: string) => {
    const block = read(key);
    if (block === null) {
      throw new PageDataError(`the page holds no media block "${key}"`);
    }
    const type = block.mimeType ?? "";
    return new Blob([decodeBase64(block.text)], { type });
  };
  return {
    slideshow,
    copy,
    openPicture: (key) => {
      try {
        return Promise.resolve(media(key));
      } catch (error: unknown) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
    music: slideshow.music === undefined ? null : media(MUSIC_KEY),
  };
}

function parseJson(read: ReadBlock, id: string): unknown {
  const block = read(id);
  if (block === null) {
    throw new PageDataError(`the page holds no "${id}" block; it is no Glissando web page`);
  }
  try {
    return JSON.parse(block.text);
  } catch (error: unknown) {
    throw new PageDataError(`the page's "${id}" block is no JSON`, { cause: error });
  }
}

function readCopy(input: unknown): PageCopy {
  if (typeof input !== "object" || input === null) {
    throw new PageDataError(`the page's "${COPY_BLOCK_ID}" block must be an object`);
  }
  const known: readonly string[] = PAGE_COPY_KEYS;
  const unknownKey = Object.keys(input).find((key) => !known.includes(key));
  if (unknownKey !== undefined) {
    throw new PageDataError(`the page's copy has the unknown key "${unknownKey}"`);
  }
  const entries = PAGE_COPY_KEYS.map((key) => {
    const value: unknown = Reflect.get(input, key);
    if (typeof value !== "string") {
      throw new PageDataError(`the page's copy needs the key "${key}" as text`);
    }
    return [key, value] as const;
  });
  return Object.fromEntries(entries) as Record<keyof PageCopy, string>;
}
