import type { LibraryStore, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import type { CheckedGlissandoFile } from "./check-glissando-file";
import { ownMusicFields } from "./glissando-manifest";
import { uniqueTitle } from "./unique-title";

export type OpenStep = (
  | { readonly kind: "picture"; readonly number: number; readonly count: number }
  | { readonly kind: "music" }
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
 * written (see dev-docs/LIBRARY.md, "Abandoned imports and claims").
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
  const files = count * 2 + (slideshow.music === undefined ? 0 : 1);
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
        ...(picture.kenBurns === undefined ? {} : { kenBurns: picture.kenBurns }),
        ...(picture.caption === undefined ? {} : { caption: picture.caption }),
        ...(picture.durationMs === undefined ? {} : { durationMs: picture.durationMs }),
        ...(picture.transition === undefined ? {} : { transition: picture.transition }),
      });
    }
    const music = slideshow.music;
    let storedMusic: StoredSlideshow["music"];
    if (music !== undefined) {
      options.onStep?.({ kind: "music", fraction: written / files });
      const id = await claimed((musicId) => store.putMusic(musicId, contents.media(music.file)));
      storedMusic = {
        id,
        fileName: music.fileName,
        durationMs: music.durationMs,
        mimeType: music.mimeType,
        ...ownMusicFields(music),
      };
    }
    options.signal.throwIfAborted();
    const created: StoredSlideshow = {
      id: ports.newId(),
      title: uniqueTitle(slideshow.title, options.existingTitles),
      createdAt: ports.now().toISOString(),
      pictures,
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      ...(slideshow.transition === undefined ? {} : { transition: slideshow.transition }),
      ...(storedMusic === undefined ? {} : { music: storedMusic }),
      secondsPerPicture: slideshow.secondsPerPicture,
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
