import { checkMediaFile } from "./check-media-file";
import { glissandoEntries } from "./entry-layout";
import { isAllowedEntryName } from "./entry-names";
import {
  MAX_CLIP_BYTES,
  MAX_DISPLAY_PICTURE_BYTES,
  MAX_MANIFEST_BYTES,
  MAX_THUMBNAIL_BYTES,
  MAX_TOTAL_ENTRY_BYTES,
} from "./file-limits";
import { MANIFEST_ENTRY_NAME, type GlissandoManifest } from "./glissando-manifest";
import type { MediaDecoders } from "./media-decoders";
import { mediaDescriptors, type MediaDescriptor } from "./media-descriptors";
import { readManifest } from "./read-manifest";
import { readEntry, readZipDirectory, startsLikeZip, type ZipEntry } from "./zip-reader";

/** A file that passed every check; its media are slices of it, typed for the store. */
export interface CheckedGlissandoFile {
  readonly manifest: GlissandoManifest;
  /** Each media file's bytes, by its path in the manifest: unpacked again from a deflated entry. */
  media(path: string): Promise<Blob>;
  /** What the media need in storage, made thumbnails included. */
  readonly mediaBytes: number;
}

export type GlissandoFileCheck =
  | { readonly kind: "ok"; readonly contents: CheckedGlissandoFile }
  | { readonly kind: "foreign" }
  | { readonly kind: "newer" }
  | { readonly kind: "damaged"; readonly reason: string }
  | { readonly kind: "tooLarge"; readonly neededBytes: number; readonly freeBytes: number };

export interface CheckOptions {
  /** Free storage on the device in bytes; null where the browser cannot tell. */
  freeBytes(): Promise<number | null>;
  /** Decodes each medium before it is stored, so a file that is not what it says is refused. */
  readonly mediaDecoders: MediaDecoders;
  /** The share of the media checked, from 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
  /** Cancels the check between media files; it then rejects with the signal's reason. */
  readonly signal?: AbortSignal;
}

/** A medium's own size limit; a song has none beyond the container's total (ADR-0038). */
const MEDIA_SIZE_LIMITS: Readonly<Partial<Record<MediaDescriptor["kind"], number>>> = {
  picture: MAX_DISPLAY_PICTURE_BYTES,
  thumbnail: MAX_THUMBNAIL_BYTES,
  video: MAX_CLIP_BYTES,
};

/**
 * Checks a file before anything of it is written (ADR-0038): that it is a .glissando file (a ZIP
 * holding `glissando.json`, as packed by the export or any ZIP tool), a version this app reads,
 * every entry name and size within what the format allows, every media file's checksum right and
 * its bytes what its name and the manifest say; a missing thumbnail is made from its picture.
 * Media is read one file at a time.
 */
export async function checkGlissandoFile(
  file: Blob,
  options: CheckOptions,
): Promise<GlissandoFileCheck> {
  if (!(await startsLikeZip(file))) {
    return { kind: "foreign" };
  }
  const entries = await readZipDirectory(file);
  if (entries === null) {
    return damaged("the ZIP directory is missing or inconsistent: the file is cut short or broken");
  }
  const layout = glissandoEntries(entries);
  if (layout.kind === "foreign") {
    return { kind: "foreign" };
  }
  if (layout.kind === "damaged") {
    return damaged(layout.reason);
  }
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (totalBytes > MAX_TOTAL_ENTRY_BYTES) {
    return damaged(
      `the file's entries total ${totalBytes} bytes, over the ${MAX_TOTAL_ENTRY_BYTES} limit`,
    );
  }
  const byName = layout.entries;
  for (const [name, entry] of byName) {
    if (!isAllowedEntryName(name)) {
      return damaged(`"${entry.name}" is not an entry name this format uses`);
    }
  }

  const manifestEntry = byName.get(MANIFEST_ENTRY_NAME);
  if (manifestEntry === undefined) {
    return { kind: "foreign" };
  }
  if (manifestEntry.size > MAX_MANIFEST_BYTES) {
    return damaged(
      `${MANIFEST_ENTRY_NAME} is ${manifestEntry.size} bytes, over the ${MAX_MANIFEST_BYTES} limit`,
    );
  }
  const manifestRead = await readEntry(file, manifestEntry);
  if (manifestRead.kind !== "ok") {
    return manifestRead;
  }
  const reading = readManifest(await manifestRead.data.text());
  if (reading.kind !== "ok") {
    return reading;
  }
  const manifest = reading.manifest;
  const media = mediaDescriptors(manifest);
  if (media.kind !== "ok") {
    return media;
  }
  const missingThumbnails = missingThumbnailsByPicture(manifest, byName);
  const mediaEntries: [ZipEntry, MediaDescriptor][] = [];
  for (const [path, descriptor] of media.byPath) {
    const entry = byName.get(path);
    if (entry !== undefined) {
      mediaEntries.push([entry, descriptor]);
    } else if (descriptor.kind !== "thumbnail") {
      return damaged(`"${path}" is missing`);
    }
  }
  for (const [entry, descriptor] of mediaEntries) {
    const limit = MEDIA_SIZE_LIMITS[descriptor.kind];
    if (limit !== undefined && entry.size > limit) {
      return damaged(`"${entry.name}" is ${entry.size} bytes, over the ${limit} limit`);
    }
  }

  const mediaBytes = mediaEntries.reduce((sum, [entry]) => sum + entry.size, 0);
  const freeBytes = await options.freeBytes();
  if (freeBytes !== null && mediaBytes > freeBytes) {
    return { kind: "tooLarge", neededBytes: mediaBytes, freeBytes };
  }

  const madeThumbnails = new Map<string, Blob>();
  let checkedBytes = 0;
  for (const [entry, descriptor] of mediaEntries) {
    options.signal?.throwIfAborted();
    const read = await readEntry(file, entry);
    if (read.kind !== "ok") {
      return read;
    }
    const reason = await checkMediaFile(entry.name, read.data, descriptor, options.mediaDecoders);
    if (reason !== null) {
      return damaged(reason);
    }
    for (const thumbnail of missingThumbnails.get(entry) ?? []) {
      madeThumbnails.set(thumbnail, await options.mediaDecoders.thumbnail(read.data));
    }
    checkedBytes += entry.size;
    options.onProgress?.(mediaBytes === 0 ? 1 : checkedBytes / mediaBytes);
  }
  const madeBytes = [...madeThumbnails.values()].reduce((sum, made) => sum + made.size, 0);
  return {
    kind: "ok",
    contents: {
      manifest,
      mediaBytes: mediaBytes + madeBytes,
      async media(path) {
        const made = madeThumbnails.get(path);
        if (made !== undefined) {
          return made;
        }
        const descriptor = media.byPath.get(path);
        const entry = byName.get(path);
        if (entry === undefined || descriptor === undefined) {
          throw new Error(`"${path}" is no media file of this .glissando file`);
        }
        const read = await readEntry(file, entry, {
          type: descriptor.mimeType,
          checkedBefore: true,
        });
        if (read.kind !== "ok") {
          throw new Error(`"${path}" changed after it was checked: ${read.reason}`);
        }
        return read.data;
      },
    },
  };
}

/** The thumbnail paths with no entry, by the entry of the picture each is made from. */
function missingThumbnailsByPicture(
  manifest: GlissandoManifest,
  byName: ReadonlyMap<string, ZipEntry>,
): Map<ZipEntry, string[]> {
  const missing = new Map<ZipEntry, string[]>();
  for (const picture of manifest.slideshow.pictures) {
    const pictureEntry = byName.get(picture.file);
    if (pictureEntry !== undefined && !byName.has(picture.thumbnail)) {
      missing.set(pictureEntry, [...(missing.get(pictureEntry) ?? []), picture.thumbnail]);
    }
  }
  return missing;
}

function damaged(reason: string): GlissandoFileCheck {
  return { kind: "damaged", reason };
}
