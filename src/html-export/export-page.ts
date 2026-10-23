import { composeSlideshow, type SongBeats, type SongLoudness } from "../compose";
import type { PictureFocus } from "../library/picture-focus";
import type { LibraryStore } from "../library/library-store";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { cardFontFilesUsedBy, isGroundSlide, type Slideshow } from "../player";
import { encodeBase64 } from "./base64";
import { cardFontFaceRules, MEDIA_BLOCK_END, mediaBlockStart, pageHead, pageTail } from "./page";
import { pictureKey, songKey, videoKey, type PageCopy } from "./page-contract";
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
  /** The songs' beats found so far, by music id; the automatic picture changes land on them (ADR-0021). */
  readonly beats: SongBeats;
  /** The songs' loudness found so far, by music id; levels each track's gain (ADR-0040). */
  readonly loudness: SongLoudness;
  readonly sizeId: PageSizeId;
  /** The app's language at export time. */
  readonly lang: string;
  readonly copy: PageCopy;
  readonly noscript: string;
  readonly media: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "videoBlob">;
  readonly scaler: PictureScaler;
  readonly sink: PageSink;
  readonly playerAsset: PlayerAsset;
  /** Checked before each picture, each medium's chunk and closing the page. */
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: PageExportProgress) => void;
}

export interface PageExportResult {
  readonly bytesWritten: number;
}

const utf8 = new TextEncoder();

/**
 * The bytes of a picture, the music or a clip read, encoded and written at a time, so a medium is never
 * held whole as a string. A multiple of 3, so only the last chunk's base64 is padded.
 */
export const MEDIA_CHUNK_BYTES = 3 * 256 * 1024;

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
  const composed = composeSlideshow(
    stored,
    { picture: (id) => keys.get(id) ?? id, music: (id) => id, video: (id) => id },
    job.focus,
    job.beats,
    job.loudness,
  );
  const songs = playedSongs(stored, composed);
  const clips = playedClips(composed);
  const slideshow = withVideoKeys(withSongKeys(composed, songs), clips);
  let bytesWritten = 0;
  const write = async (text: string, bytes: number) => {
    await sink.write(text);
    bytesWritten += bytes;
  };
  const writeText = (text: string) => write(text, utf8.encode(text).length);
  const writeBlock = async (key: string, mimeType: string, blob: Blob) => {
    await writeText(mediaBlockStart(key, mimeType));
    for (let start = 0; start < blob.size; start += MEDIA_CHUNK_BYTES) {
      signal?.throwIfAborted();
      const chunk = blob.slice(start, start + MEDIA_CHUNK_BYTES);
      const base64 = encodeBase64(new Uint8Array(await chunk.arrayBuffer()));
      // Base64 is ASCII: one byte per character.
      await write(base64, base64.length);
    }
    await writeText(MEDIA_BLOCK_END);
  };
  const report = (picturesDone: number) =>
    job.onProgress?.({ picturesDone, pictureCount: stored.pictures.length, bytesWritten });

  await writeText(
    pageHead({
      lang: job.lang,
      title: stored.title,
      noscript: job.noscript,
      copy: copyWithSampleCredit(job.copy, songs),
      slideshow,
      style: bundle.style,
      captionFontDataUrl: bundle.captionFontDataUrl,
      cardFontFaceRules: cardFontFaceRules(cardFontFilesUsedBy(slideshow), bundle.cardFontDataUrls),
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
  for (const [index, song] of songs.entries()) {
    signal?.throwIfAborted();
    await writeBlock(songKey(index), song.mimeType, await job.media.musicBlob(song.id));
  }
  for (const [index, mediaId] of clips.entries()) {
    signal?.throwIfAborted();
    const clip = await job.media.videoBlob(mediaId);
    await writeBlock(videoKey(index), clip.type, clip);
  }
  await writeText(pageTail(bundle.script));
  signal?.throwIfAborted();
  await sink.close();
  report(stored.pictures.length);
  return { bytesWritten };
}

/** The songs the composed slideshow plays, each once, in playlist order. */
function playedSongs(stored: StoredSlideshow, slideshow: Slideshow): readonly StoredMusic[] {
  const played = new Set(slideshow.music?.map((track) => track.src));
  return stored.songs.filter((song) => played.has(song.id));
}

/** `copy` with its sample-music credit blanked unless one of `songs` is a sample track. */
function copyWithSampleCredit(copy: PageCopy, songs: readonly StoredMusic[]): PageCopy {
  const hasSampleTrack = songs.some((song) => song.sampleTrack !== undefined);
  return hasSampleTrack ? copy : { ...copy, sampleMusicCredit: "" };
}

/** Points every track at its song's block. */
function withSongKeys(slideshow: Slideshow, songs: readonly StoredMusic[]): Slideshow {
  if (slideshow.music === undefined) {
    return slideshow;
  }
  const keys = new Map(songs.map((song, index) => [song.id, songKey(index)]));
  return {
    ...slideshow,
    music: slideshow.music.map((track) => {
      const key = keys.get(track.src);
      if (key === undefined) {
        throw new Error(`the track's song ${track.src} is not in the slideshow's songs`);
      }
      return { ...track, src: key };
    }),
  };
}

/** The media ids of the clips the composed slideshow plays, each once, in show order. */
function playedClips(slideshow: Slideshow): readonly string[] {
  const ids = slideshow.slides.flatMap((slide) =>
    !isGroundSlide(slide) && slide.video !== undefined ? [slide.video.src] : [],
  );
  return [...new Set(ids)];
}

/** Points every video slide at its clip's block. */
function withVideoKeys(slideshow: Slideshow, clips: readonly string[]): Slideshow {
  if (clips.length === 0) {
    return slideshow;
  }
  const keys = new Map(clips.map((mediaId, index) => [mediaId, videoKey(index)]));
  return {
    ...slideshow,
    slides: slideshow.slides.map((slide) =>
      isGroundSlide(slide) || slide.video === undefined
        ? slide
        : {
            ...slide,
            video: { ...slide.video, src: keys.get(slide.video.src) ?? slide.video.src },
          },
    ),
  };
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
