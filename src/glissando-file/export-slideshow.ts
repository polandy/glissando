import type { LibraryStore, StoredSlideshow } from "../library/stored-slideshow";
import { manifestFor, MANIFEST_ENTRY_NAME } from "./glissando-manifest";
import { StoredZipWriter } from "./stored-zip";

export const GLISSANDO_FILE_EXTENSION = ".glissando";
/** The name a title that is nothing but forbidden characters falls back to. */
const FALLBACK_FILE_NAME = "Glissando";
/** Characters Windows, macOS or Linux refuse in a file name, and control characters. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_IN_FILE_NAMES = /[\\/:*?"<>|\u0000-\u001f]+/g;
const TRIMMED_AT_ENDS = /^[\s.-]+|[\s.-]+$/g;
const MANIFEST_TYPE = "application/json";

export type ExportMedia = Pick<LibraryStore, "pictureBlob" | "thumbnailBlob" | "musicBlob">;

export interface ExportOptions {
  /** The entries' modification time in the container. */
  readonly modifiedAt: Date;
  /** The share of the work done, from 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
}

/**
 * The slideshow as a .glissando file: `glissando.json` first (it marks the file as one), then
 * each picture in play order with its thumbnail, then the music. The media is read from the
 * store one file at a time; the container is built from their blobs.
 */
export async function exportSlideshow(
  slideshow: StoredSlideshow,
  media: ExportMedia,
  options: ExportOptions,
): Promise<Blob> {
  const music = slideshow.music;
  const mediaCount = slideshow.pictures.length * 2 + (music === undefined ? 0 : 1);
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
  const musicBlob = music === undefined ? undefined : await media.musicBlob(music.id);
  if (musicBlob !== undefined) {
    step();
  }

  const types = pictures.map(({ display, thumbnail }) => ({
    display: display.type,
    thumbnail: thumbnail.type,
  }));
  const manifest = manifestFor(slideshow, types);
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
  const manifestMusic = manifest.slideshow.music;
  if (manifestMusic !== undefined && musicBlob !== undefined) {
    await zip.add(manifestMusic.file, musicBlob);
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
