import { checkMediaFile } from "./check-media-file";
import { crc32OfBlob } from "./crc32";
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
import { entryData, firstEntryName, readZipDirectory, type ZipEntry } from "./stored-zip";

/** A file that passed every check; its media are slices of it, typed for the store. */
export interface CheckedGlissandoFile {
  readonly manifest: GlissandoManifest;
  /** Each media file's bytes, by its path in the manifest. */
  media(path: string): Blob;
  /** What the media need in storage. */
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
 * Checks a file before anything of it is written (ADR-0038): that it is a .glissando file (its
 * first entry is `glissando.json`), a version this app reads, every entry name and size within
 * what the format allows, every media file's checksum right and its bytes what its name and the
 * manifest say. Media is read one file at a time.
 */
export async function checkGlissandoFile(
  file: Blob,
  options: CheckOptions,
): Promise<GlissandoFileCheck> {
  if ((await firstEntryName(file)) !== MANIFEST_ENTRY_NAME) {
    return { kind: "foreign" };
  }
  const entries = await readZipDirectory(file);
  if (entries === null) {
    return damaged("the ZIP directory is missing or inconsistent: the file is cut short or broken");
  }
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (totalBytes > MAX_TOTAL_ENTRY_BYTES) {
    return damaged(
      `the file's entries total ${totalBytes} bytes, over the ${MAX_TOTAL_ENTRY_BYTES} limit`,
    );
  }
  for (const entry of entries) {
    if (!isAllowedEntryName(entry.name)) {
      return damaged(`"${entry.name}" is not an entry name this format uses`);
    }
  }

  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const manifestEntry = byName.get(MANIFEST_ENTRY_NAME);
  if (manifestEntry === undefined) {
    return damaged(`${MANIFEST_ENTRY_NAME} does not match its checksum`);
  }
  if (manifestEntry.size > MAX_MANIFEST_BYTES) {
    return damaged(
      `${MANIFEST_ENTRY_NAME} is ${manifestEntry.size} bytes, over the ${MAX_MANIFEST_BYTES} limit`,
    );
  }
  if (!(await checksumMatches(file, manifestEntry))) {
    return damaged(`${MANIFEST_ENTRY_NAME} does not match its checksum`);
  }
  const reading = readManifest(await entryData(file, manifestEntry).text());
  if (reading.kind !== "ok") {
    return reading;
  }
  const manifest = reading.manifest;
  const media = mediaDescriptors(manifest);
  if (media.kind !== "ok") {
    return media;
  }
  const mediaEntries: [ZipEntry, MediaDescriptor][] = [];
  for (const [path, descriptor] of media.byPath) {
    const entry = byName.get(path);
    if (entry === undefined) {
      return damaged(`"${path}" is missing`);
    }
    mediaEntries.push([entry, descriptor]);
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

  let checkedBytes = 0;
  for (const [entry, descriptor] of mediaEntries) {
    options.signal?.throwIfAborted();
    const data = entryData(file, entry);
    if (!(await checksumMatches(file, entry))) {
      return damaged(`"${entry.name}" does not match its checksum`);
    }
    const reason = await checkMediaFile(entry.name, data, descriptor, options.mediaDecoders);
    if (reason !== null) {
      return damaged(reason);
    }
    checkedBytes += entry.size;
    options.onProgress?.(mediaBytes === 0 ? 1 : checkedBytes / mediaBytes);
  }
  return {
    kind: "ok",
    contents: {
      manifest,
      mediaBytes,
      media(path) {
        const descriptor = media.byPath.get(path);
        const entry = byName.get(path);
        if (entry === undefined || descriptor === undefined) {
          throw new Error(`"${path}" is no media file of this .glissando file`);
        }
        return entryData(file, entry, descriptor.mimeType);
      },
    },
  };
}

async function checksumMatches(file: Blob, entry: ZipEntry): Promise<boolean> {
  return (await crc32OfBlob(entryData(file, entry))) === entry.crc32;
}

function damaged(reason: string): GlissandoFileCheck {
  return { kind: "damaged", reason };
}
