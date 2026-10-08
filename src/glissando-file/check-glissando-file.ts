import { crc32OfBlob } from "./crc32";
import {
  MANIFEST_ENTRY_NAME,
  readManifest,
  typeOfPicturePath,
  type GlissandoManifest,
} from "./glissando-manifest";
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
  /** The share of the media checked, from 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
  /** Cancels the check between media files; it then rejects with the signal's reason. */
  readonly signal?: AbortSignal;
}

/**
 * Checks a file before anything of it is written: that it is a .glissando file (its first entry
 * is `glissando.json`), a version this app reads, complete, every media file's checksum right,
 * and that its media fit into the free storage. Media is read one file at a time.
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
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const manifestEntry = byName.get(MANIFEST_ENTRY_NAME);
  if (manifestEntry === undefined || !(await checksumMatches(file, manifestEntry))) {
    return damaged(`${MANIFEST_ENTRY_NAME} does not match its checksum`);
  }
  const reading = readManifest(await entryData(file, manifestEntry).text());
  if (reading.kind !== "ok") {
    return reading;
  }
  const manifest = reading.manifest;
  const media = mediaTypes(manifest);
  const mediaEntries: ZipEntry[] = [];
  for (const [path, type] of media) {
    const entry = byName.get(path);
    if (entry === undefined || type === null) {
      return damaged(`"${path}" is ${entry === undefined ? "missing" : "of an unknown type"}`);
    }
    mediaEntries.push(entry);
  }

  const mediaBytes = mediaEntries.reduce((sum, entry) => sum + entry.size, 0);
  const freeBytes = await options.freeBytes();
  if (freeBytes !== null && mediaBytes > freeBytes) {
    return { kind: "tooLarge", neededBytes: mediaBytes, freeBytes };
  }

  let checkedBytes = 0;
  for (const entry of mediaEntries) {
    options.signal?.throwIfAborted();
    if (!(await checksumMatches(file, entry))) {
      return damaged(`"${entry.name}" does not match its checksum`);
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
        const entry = byName.get(path);
        if (entry === undefined || !media.has(path)) {
          throw new Error(`"${path}" is no media file of this .glissando file`);
        }
        return entryData(file, entry, media.get(path) ?? "");
      },
    },
  };
}

/** Every media path the manifest names, with its MIME type (null for an unknown extension). */
function mediaTypes(manifest: GlissandoManifest): Map<string, string | null> {
  const types = new Map<string, string | null>();
  for (const picture of manifest.slideshow.pictures) {
    types.set(picture.file, typeOfPicturePath(picture.file));
    types.set(picture.thumbnail, typeOfPicturePath(picture.thumbnail));
  }
  const music = manifest.slideshow.music;
  if (music !== undefined) {
    types.set(music.file, music.mimeType);
  }
  return types;
}

async function checksumMatches(file: Blob, entry: ZipEntry): Promise<boolean> {
  return (await crc32OfBlob(entryData(file, entry))) === entry.crc32;
}

function damaged(reason: string): GlissandoFileCheck {
  return { kind: "damaged", reason };
}
