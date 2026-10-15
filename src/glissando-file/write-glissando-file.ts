import type {
  LibraryStore,
  StoredMusic,
  StoredPicture,
  StoredSlideshow,
} from "../library/stored-slideshow";
import type { CheckedGlissandoFile } from "./check-glissando-file";
import { ownMusicFields } from "./glissando-manifest";
import { storedVideo } from "./manifest-video";
import { cardFromManifest } from "./manifest-card";
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

  const claimed = async (write: (id: string) => Promise<void>): Promise<string> => {
    options.signal.throwIfAborted();
    const id = ports.newId();
    await store.claimMedia(claimId, startedAt, id);
    await write(id);
    return id;
  };

  try {
    const pictures: StoredPicture[] = [];
    for (const [index, picture] of slideshow.pictures.entries()) {
      options.onStep?.({ kind: "picture", number: index + 1, count, fraction: written / files });
      const id = await claimed((pictureId) =>
        store.putPicture(pictureId, {
          display: contents.media(picture.file),
          thumbnail: contents.media(picture.thumbnail),
        }),
      );
      written += 2;
      pictures.push({
        id,
        capturedAt: picture.capturedAt,
        width: picture.width,
        height: picture.height,
        fileName: picture.fileName,
        colours: picture.colours,
        ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
        ...(picture.caption === undefined ? {} : { caption: picture.caption }),
        ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
        ...(picture.transition === undefined ? {} : { transition: picture.transition }),
        ...(picture.immichAssetId === undefined ? {} : { immichAssetId: picture.immichAssetId }),
        ...(picture.fileBytes === undefined ? {} : { fileBytes: picture.fileBytes }),
        ...(picture.alone === true ? { alone: true } : {}),
      });
    }
    const songs: StoredMusic[] = [];
    for (const [index, song] of slideshow.songs.entries()) {
      options.onStep?.({
        kind: "music",
        number: index + 1,
        count: songCount,
        fraction: written / files,
      });
      const id = await claimed((musicId) => store.putMusic(musicId, contents.media(song.file)));
      written += 1;
      songs.push({
        id,
        fileName: song.fileName,
        durationMs: song.durationMs,
        mimeType: song.mimeType,
        ...ownMusicFields(song),
      });
    }
    const clipIds = new Map<string, string>();
    for (const [index, clip] of clipFiles.entries()) {
      options.onStep?.({
        kind: "video",
        number: index + 1,
        count: clipFiles.length,
        fraction: written / files,
      });
      const id = await claimed((videoId) => store.putVideo(videoId, contents.media(clip.file)));
      written += 1;
      clipIds.set(clip.file, id);
    }
    options.signal.throwIfAborted();
    const placed = pictures.map((picture, index): StoredPicture => {
      const video = slideshow.pictures[index]?.video;
      return video === undefined ? picture : { ...picture, video: storedVideo(video, clipIds) };
    });
    const pictureIds = placed.map((picture) => picture.id);
    const openingCard = cardFromManifest(slideshow.openingCard, pictureIds);
    const closingCard = cardFromManifest(slideshow.closingCard, pictureIds);
    const created: StoredSlideshow = {
      id: ports.newId(),
      title: uniqueTitle(slideshow.title, options.existingTitles),
      createdAt: ports.now().toISOString(),
      pictures: placed,
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      ...(slideshow.pictureLength === undefined ? {} : { pictureLength: slideshow.pictureLength }),
      ...(slideshow.portraitPictures === undefined
        ? {}
        : { portraitPictures: slideshow.portraitPictures }),
      ...(slideshow.transition === undefined ? {} : { transition: slideshow.transition }),
      songs,
      ...(slideshow.betweenSongs === undefined ? {} : { betweenSongs: slideshow.betweenSongs }),
      secondsPerPicture: slideshow.secondsPerPicture,
      ...(openingCard === undefined ? {} : { openingCard }),
      ...(closingCard === undefined ? {} : { closingCard }),
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
