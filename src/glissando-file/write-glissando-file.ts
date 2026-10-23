import type { LibraryStore } from "../library/library-store";
import type { StoredSlideshow } from "../library/stored-slideshow";
import type { CheckedGlissandoFile } from "./check-glissando-file";
import { slideshowFromManifest } from "./slideshow-from-manifest";
import { uniqueTitle } from "./unique-title";

export type OpenStep = (
  | { readonly kind: "picture"; readonly number: number; readonly count: number }
  | { readonly kind: "music"; readonly number: number; readonly count: number }
  | { readonly kind: "video"; readonly number: number; readonly count: number }
) & {
  /** The share of the media files written before this step, from 0 to 1. */
  readonly fraction: number;
};

export interface WritePorts {
  readonly store: Pick<
    LibraryStore,
    | "claimMedia"
    | "putPicture"
    | "putMusic"
    | "putVideo"
    | "saveSlideshow"
    | "releaseClaim"
    | "deleteUnreferencedMedia"
  >;
  newId(): string;
  now(): Date;
  /** Where a failed clean-up after a failed write is reported; the write's own error wins. */
  log(error: unknown): void;
}

export interface WriteOptions {
  /** The titles in the library; the new slideshow never takes one of them. */
  readonly existingTitles: readonly string[];
  /** Cancels the write; it then rejects with the signal's reason. */
  readonly signal: AbortSignal;
  readonly onStep?: (step: OpenStep) => void;
}

/**
 * Stores a checked file as a new slideshow with fresh ids; it never replaces one. All or
 * nothing: every media id is claimed before its media is written and the record is saved last,
 * so a cancel or a failure (e.g. `QuotaExceededError`) releases the claim and deletes what was
 * written (see dev-docs/library/ABANDONED_IMPORTS.md).
 */
export async function writeGlissandoFile(
  contents: CheckedGlissandoFile,
  ports: WritePorts,
  options: WriteOptions,
): Promise<StoredSlideshow> {
  const { store } = ports;
  const claimId = ports.newId();
  const startedAt = ports.now();
  const { slideshow } = contents.manifest;
  const count = slideshow.pictures.length;
  const songCount = slideshow.songs.length;
  const clipFiles = [
    ...new Map(
      slideshow.pictures.flatMap(({ video }) => (video === undefined ? [] : [[video.file, video]])),
    ).values(),
  ];
  const files = count * 2 + songCount + clipFiles.length;
  let written = 0;

  // One id per picture and song, and one per distinct clip file, generated up front in the file's
  // order so `slideshowFromManifest` can map everything in one pass once the media is written.
  const pictureIds = slideshow.pictures.map(() => ports.newId());
  const songIds = slideshow.songs.map(() => ports.newId());
  const clipIds = new Map(clipFiles.map((clip) => [clip.file, ports.newId()]));

  const claimed = async (id: string, write: (id: string) => Promise<void>): Promise<void> => {
    options.signal.throwIfAborted();
    await store.claimMedia(claimId, startedAt, id);
    await write(id);
  };

  try {
    for (const [index, picture] of slideshow.pictures.entries()) {
      options.onStep?.({ kind: "picture", number: index + 1, count, fraction: written / files });
      const id = requireId(pictureIds, index, "picture");
      await claimed(id, async (pictureId) =>
        store.putPicture(pictureId, {
          display: await contents.media(picture.file),
          thumbnail: await contents.media(picture.thumbnail),
        }),
      );
      written += 2;
    }
    for (const [index, song] of slideshow.songs.entries()) {
      options.onStep?.({
        kind: "music",
        number: index + 1,
        count: songCount,
        fraction: written / files,
      });
      const id = requireId(songIds, index, "song");
      await claimed(id, async (musicId) =>
        store.putMusic(musicId, await contents.media(song.file)),
      );
      written += 1;
    }
    for (const [index, clip] of clipFiles.entries()) {
      options.onStep?.({
        kind: "video",
        number: index + 1,
        count: clipFiles.length,
        fraction: written / files,
      });
      const id = clipIds.get(clip.file);
      if (id === undefined) {
        throw new Error(`clip ${clip.file} has no id: it was not counted among clipFiles`);
      }
      await claimed(id, async (videoId) =>
        store.putVideo(videoId, await contents.media(clip.file)),
      );
      written += 1;
    }
    options.signal.throwIfAborted();
    const created: StoredSlideshow = {
      id: ports.newId(),
      title: uniqueTitle(slideshow.title, options.existingTitles),
      createdAt: ports.now().toISOString(),
      ...slideshowFromManifest(slideshow, { pictureIds, songIds, clipIds }),
    };
    await store.saveSlideshow(created);
    await store.releaseClaim(claimId);
    return created;
  } catch (error) {
    try {
      await store.releaseClaim(claimId);
      await store.deleteUnreferencedMedia(ports.now());
    } catch (cleanUpError) {
      ports.log(cleanUpError);
    }
    throw error;
  }
}

function requireId(ids: readonly string[], index: number, kind: string): string {
  const id = ids[index];
  if (id === undefined) {
    throw new Error(`${kind} ${index} has no id: pass one id per ${kind}`);
  }
  return id;
}
