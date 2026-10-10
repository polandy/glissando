import { composeSlideshow } from "../compose";
import type { PictureFocus } from "../library/picture-focus";
import type { LibraryStore, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { encodeBase64 } from "./base64";
import { MEDIA_BLOCK_END, mediaBlockStart, pageHead, pageTail } from "./page";
import { MUSIC_KEY, pictureKey, type PageCopy } from "./page-contract";
import { PAGE_JPEG_QUALITY, pictureRendition, type PageSizeId } from "./plan";
import type { PageSink, PictureScaler, PlayerAsset, PlayerBundle } from "./ports";

/** A picture that could not be read or scaled; the page stays unwritten. */
export class PagePictureError extends Error {
  override readonly name = "PagePictureError";

  constructor(
    readonly pictureIndex: number,
    readonly fileName: string,
    options: ErrorOptions,
  ) {
    super(`picture ${pictureIndex + 1} (${fileName}) could not be put into the page`, options);
  }
}

/** The export player could not be loaded, e.g. offline before it was ever cached. */
export class PlayerAssetError extends Error {
  override readonly name = "PlayerAssetError";
}

export interface PageExportProgress {
  readonly picturesDone: number;
  readonly pictureCount: number;
  readonly bytesWritten: number;
}

export interface PageExportJob {
  readonly stored: StoredSlideshow;
  /** The focus found so far, by picture id; it aims the automatic motions. */
  readonly focus: ReadonlyMap<string, PictureFocus>;
  readonly sizeId: PageSizeId;
  /** The app's language at export time. */
  readonly lang: string;
  readonly copy: PageCopy;
  readonly noscript: string;
  readonly media: Pick<LibraryStore, "pictureBlob" | "musicBlob">;
  readonly scaler: PictureScaler;
  readonly sink: PageSink;
  readonly playerAsset: PlayerAsset;
  /** Checked before each picture. */
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: PageExportProgress) => void;
}

export interface PageExportResult {
  readonly bytesWritten: number;
}

const utf8 = new TextEncoder();

/**
 * Writes `stored` as one self-contained web page to the job's sink (dev-docs/HTML_EXPORT.md).
 * On a failure or a cancel the sink is aborted and the error rethrown: the signal's reason, a
 * `PagePictureError`, a `PlayerAssetError`, or the sink's own.
 */
export async function exportPage(job: PageExportJob): Promise<PageExportResult> {
  try {
    return await writePage(job);
  } catch (error: unknown) {
    try {
      await job.sink.abort();
    } catch (abortError: unknown) {
      throw new AggregateError([error, abortError], "the page failed and could not be dropped", {
        cause: abortError,
      });
    }
    throw error;
  }
}

async function writePage(job: PageExportJob): Promise<PageExportResult> {
  const { stored, sink, signal } = job;
  const bundle = await loadBundle(job.playerAsset);
  const keys = new Map(stored.pictures.map((picture, index) => [picture.id, pictureKey(index)]));
  const slideshow = composeSlideshow(
    stored,
    { picture: (id) => keys.get(id) ?? id, music: () => MUSIC_KEY },
    job.focus,
  );
  let bytesWritten = 0;
  const write = async (text: string, bytes: number) => {
    await sink.write(text);
    bytesWritten += bytes;
  };
  const writeText = (text: string) => write(text, utf8.encode(text).length);
  const writeBlock = async (key: string, mimeType: string, blob: Blob) => {
    await writeText(mediaBlockStart(key, mimeType));
    // Base64 is ASCII: one byte per character.
    const base64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));
    await write(base64, base64.length);
    await writeText(MEDIA_BLOCK_END);
  };
  const report = (picturesDone: number) =>
    job.onProgress?.({ picturesDone, pictureCount: stored.pictures.length, bytesWritten });

  await writeText(
    pageHead({
      lang: job.lang,
      title: stored.title,
      noscript: job.noscript,
      copy: job.copy,
      slideshow,
      style: bundle.style,
      captionFontDataUrl: bundle.captionFontDataUrl,
    }),
  );
  report(0);
  for (const [index, picture] of stored.pictures.entries()) {
    signal?.throwIfAborted();
    const jpeg = await pageJpeg(job, picture, index);
    await writeBlock(pictureKey(index), jpeg.type, jpeg);
    report(index + 1);
  }
  signal?.throwIfAborted();
  if (stored.music !== undefined) {
    await writeBlock(MUSIC_KEY, stored.music.mimeType, await job.media.musicBlob(stored.music.id));
  }
  await writeText(pageTail(bundle.script));
  await sink.close();
  report(stored.pictures.length);
  return { bytesWritten };
}

async function loadBundle(asset: PlayerAsset): Promise<PlayerBundle> {
  try {
    return await asset.load();
  } catch (error: unknown) {
    throw new PlayerAssetError("the web page player could not be loaded", { cause: error });
  }
}

const PAGE_PICTURE_TYPE = "image/jpeg";

/** The picture as the page holds it: its stored JPEG, or scaled down to the size. */
async function pageJpeg(job: PageExportJob, picture: StoredPicture, index: number): Promise<Blob> {
  try {
    const stored = await job.media.pictureBlob(picture.id);
    const rendition = pictureRendition(picture, job.sizeId);
    if (rendition.kind === "stored") {
      // Stored pictures are JPEG; the blob may have lost its type in storage.
      return stored.type === PAGE_PICTURE_TYPE
        ? stored
        : new Blob([stored], { type: PAGE_PICTURE_TYPE });
    }
    return await job.scaler.scale(stored, rendition.size, PAGE_JPEG_QUALITY);
  } catch (error: unknown) {
    throw new PagePictureError(index, picture.fileName, { cause: error });
  }
}
