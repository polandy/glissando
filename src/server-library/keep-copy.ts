import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { uniqueTitle } from "../glissando-file/unique-title";
import type { ImmichPhoto } from "../immich/immich-client";
import { immichPictureSource, type ImmichPictureReaders } from "../import/immich-picture-source";
import type {
  LibraryStore,
  SlideshowStore,
  StoredMusic,
  StoredPicture,
  StoredSlideshow,
} from "../library/stored-slideshow";

export interface KeepCopyPorts {
  /** The device's store the copy goes into. */
  readonly store: Pick<
    LibraryStore,
    | "claimMedia"
    | "putPicture"
    | "putPictureFocus"
    | "putMusic"
    | "saveSlideshow"
    | "releaseClaim"
    | "deleteUnreferencedMedia"
  >;
  /** The server's store, holding the slideshow's music and its own focus for each picture. */
  readonly server: Pick<SlideshowStore, "musicBlob" | "pictureFocus">;
  /** What downloads and decodes each picture from Immich, as the import does. */
  readonly immich: ImmichPictureReaders;
  newId(): string;
  now(): Date;
  /** Where a failed clean-up after a failed copy is reported; the copy's own error wins. */
  log(error: unknown): void;
}

export interface KeepCopyOptions {
  /** The titles on this device; the copy never takes one of them. */
  readonly existingTitles: readonly string[];
  /** Cancels the copy; it then rejects with the signal's reason. */
  readonly signal: AbortSignal;
  /** The share of the pictures and music copied so far, from 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
}

/**
 * "Keep a copy on this device" (`dev-docs/SERVER_LIBRARY.md`): a server slideshow downloaded into
 * a new, independent device slideshow. Pictures are decoded like an Immich import; each one's
 * focus is the server's own stored focus where the server has one (it may be richer than a live
 * faces lookup, e.g. confirmed or found by scenery), else Immich's faces. All or nothing, as
 * `writeGlissandoFile`: every media id is claimed before its media is written and the record is
 * saved last, so a failure (e.g. `PictureNotDownloadedError` for a picture no longer in Immich)
 * or a cancel keeps nothing.
 */
export async function keepCopyOnDevice(
  slideshow: StoredSlideshow,
  ports: KeepCopyPorts,
  options: KeepCopyOptions,
): Promise<StoredSlideshow> {
  const { store } = ports;
  const claimId = ports.newId();
  const startedAt = ports.now();
  const steps = slideshow.pictures.length + slideshow.songs.length;
  let done = 0;
  const stepDone = () => options.onProgress?.(++done / steps);

  const claimed = async (write: (id: string) => Promise<void>): Promise<string> => {
    options.signal.throwIfAborted();
    const id = ports.newId();
    await store.claimMedia(claimId, startedAt, id);
    await write(id);
    stepDone();
    return id;
  };

  try {
    options.onProgress?.(0);
    const assetIds = slideshow.pictures.flatMap((picture) =>
      picture.immichAssetId === undefined ? [] : [picture.immichAssetId],
    );
    const serverFocus = await ports.server.pictureFocus(assetIds);
    const pictures: StoredPicture[] = [];
    for (const picture of slideshow.pictures) {
      const { decoded, focus } = await immichPictureSource(photoOf(picture), ports.immich).read();
      const stored =
        picture.immichAssetId !== undefined ? serverFocus.get(picture.immichAssetId) : undefined;
      const toSave =
        stored ?? (focus === null ? null : { focus, detector: FOCUS_DETECTOR_VERSION });
      const id = await claimed(async (pictureId) => {
        await store.putPicture(pictureId, decoded);
        if (toSave !== null) {
          await store.putPictureFocus(pictureId, toSave);
        }
      });
      pictures.push({ ...picture, id, width: decoded.width, height: decoded.height });
    }
    const songs: StoredMusic[] = [];
    for (const song of slideshow.songs) {
      const audio = await ports.server.musicBlob(song.id);
      const id = await claimed((musicId) => store.putMusic(musicId, audio));
      songs.push({ ...song, id });
    }
    options.signal.throwIfAborted();
    const copy: StoredSlideshow = {
      ...slideshow,
      id: ports.newId(),
      title: uniqueTitle(slideshow.title, options.existingTitles),
      createdAt: ports.now().toISOString(),
      pictures,
      songs,
    };
    await store.saveSlideshow(copy);
    await store.releaseClaim(claimId);
    return copy;
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

/** The Immich photo a server picture links. */
function photoOf(picture: StoredPicture): ImmichPhoto {
  if (picture.immichAssetId === undefined) {
    throw new Error(
      `picture "${picture.fileName}" (${picture.id}) has no immichAssetId: only a server slideshow's pictures can be copied from Immich`,
    );
  }
  return {
    id: picture.immichAssetId,
    fileName: picture.fileName,
    takenAt: picture.capturedAt,
    size: { width: picture.width, height: picture.height },
  };
}
