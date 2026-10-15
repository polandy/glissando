import type { LibraryStore, StoredSlideshow } from "../library/stored-slideshow";
import { manifestFor, MANIFEST_ENTRY_NAME } from "./glissando-manifest";
import { distinctClipIds } from "./manifest-video";
import { StoredZipWriter } from "./stored-zip";

export const GLISSANDO_FILE_EXTENSION = ".glissando";
/** The name a title that is nothing but forbidden characters falls back to. */
const FALLBACK_FILE_NAME = "Glissando";
/** Characters Windows, macOS or Linux refuse in a file name, and control characters. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_IN_FILE_NAMES = /[\\/:*?"<>|\u0000-\u001f]+/g;
const TRIMMED_AT_ENDS = /^[\s.-]+|[\s.-]+$/g;
const MANIFEST_TYPE = "application/json";

export type ExportMedia = Pick<
  LibraryStore,
  "pictureBlob" | "thumbnailBlob" | "musicBlob" | "videoBlob"
>;

export interface ExportOptions {
  /** The entries' modification time in the container. */
  readonly modifiedAt: Date;
  /** The share of the work done, from 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
}

/**
 * The slideshow as a .glissando file: `glissando.json` first (it marks the file as one), then
 * each picture in play order with its thumbnail, then the music, then each clip a video slide
 * plays, once. The media is read from the
 * store one file at a time; the container is built from their blobs.
 */
export async function exportSlideshow(
  slideshow: StoredSlideshow,
  media: ExportMedia,
  options: ExportOptions,
): Promise<Blob> {
  const clipIds = distinctClipIds(slideshow.pictures);
  const mediaCount = slideshow.pictures.length * 2 + slideshow.songs.length + clipIds.length;
  // Each media file is read once and checksummed once.
  const steps = mediaCount * 2;
  let done = 0;
  const step = (): void => options.onProgress?.(++done / steps);

  const pictures: { display: Blob; thumbnail: Blob }[] = [];
  for (const picture of slideshow.pictures) {
    const display = await media.pictureBlob(picture.id);
    step();
    const thumbnail = await media.thumbnailBlob(picture.id);
    step();
    pictures.push({ display, thumbnail });
  }
  const songBlobs: Blob[] = [];
  for (const song of slideshow.songs) {
    songBlobs.push(await media.musicBlob(song.id));
    step();
  }

  const clipBlobs = new Map<string, Blob>();
  for (const mediaId of clipIds) {
    clipBlobs.set(mediaId, await media.videoBlob(mediaId));
    step();
  }

  const types = pictures.map(({ display, thumbnail }) => ({
    display: display.type,
    thumbnail: thumbnail.type,
  }));
  const manifest = manifestFor(
    slideshow,
    types,
    new Map([...clipBlobs].map(([mediaId, blob]) => [mediaId, blob.type])),
  );
  const zip = new StoredZipWriter(options.modifiedAt);
  await zip.add(MANIFEST_ENTRY_NAME, new Blob([JSON.stringify(manifest)], { type: MANIFEST_TYPE }));
  for (const [index, picture] of manifest.slideshow.pictures.entries()) {
    const blobs = pictures[index];
    if (blobs === undefined) {
      throw new Error(`picture ${index} of the manifest was never read`);
    }
    await zip.add(picture.file, blobs.display);
    step();
    await zip.add(picture.thumbnail, blobs.thumbnail);
    step();
  }
  for (const [index, song] of manifest.slideshow.songs.entries()) {
    const blob = songBlobs[index];
    if (blob === undefined) {
      throw new Error(`song ${index} of the manifest was never read`);
    }
    await zip.add(song.file, blob);
    step();
  }
  const written = new Set<string>();
  for (const [index, picture] of manifest.slideshow.pictures.entries()) {
    const clip = picture.video;
    const mediaId = slideshow.pictures[index]?.video?.mediaId;
    const blob = mediaId === undefined ? undefined : clipBlobs.get(mediaId);
    if (clip === undefined || blob === undefined || written.has(clip.file)) {
      continue;
    }
    written.add(clip.file);
    await zip.add(clip.file, blob);
    step();
  }
  return zip.finish();
}

/** A file name every system accepts, from the slideshow's title. */
export function glissandoFileName(title: string): string {
  return `${safeFileStem(title)}${GLISSANDO_FILE_EXTENSION}`;
}

/** The title with every character a file system refuses replaced, for any exported file. */
export function safeFileStem(title: string): string {
  const safe = title.replace(FORBIDDEN_IN_FILE_NAMES, "-").replace(TRIMMED_AT_ENDS, "");
  return safe === "" ? FALLBACK_FILE_NAME : safe;
}
