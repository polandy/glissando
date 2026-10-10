import type { SlideshowStore, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { serverDocumentFor, storedSlideshowFrom } from "./server-document";
import type { ServerLibraryClient } from "./server-library-client";

type CreatingClient = Pick<ServerLibraryClient, "uploadMusic" | "createSlideshow">;

/**
 * Creates `slideshow` on the server (its id and its music's id are ignored): uploads the music
 * first, then the document. Answers the slideshow as the server keeps it.
 */
export async function createServerSlideshow(
  slideshow: StoredSlideshow,
  musicAudio: Blob | null,
  client: CreatingClient,
): Promise<StoredSlideshow> {
  const document = serverDocumentFor({
    ...slideshow,
    ...(await uploadedMusic(slideshow, musicAudio, client)),
  });
  const { id } = await client.createSlideshow(document);
  return storedSlideshowFrom(id, document);
}

/** The slideshow's music named by the server's id once its audio is uploaded; none without. */
async function uploadedMusic(
  { music }: StoredSlideshow,
  musicAudio: Blob | null,
  client: CreatingClient,
): Promise<Pick<StoredSlideshow, "music">> {
  if (music === undefined) {
    if (musicAudio !== null) {
      throw new Error("audio was given for a slideshow without music; pass null");
    }
    return {};
  }
  if (musicAudio === null) {
    throw new Error(`the music "${music.fileName}" needs its audio to be uploaded; pass its blob`);
  }
  return { music: { ...music, id: await client.uploadMusic(musicAudio, music.mimeType) } };
}

export interface ServerPartition {
  /** Pictures from Immich, which a server slideshow links. */
  readonly linked: readonly StoredPicture[];
  /** Pictures only on this device, which a server slideshow cannot hold (ADR-0018). */
  readonly deviceOnly: readonly StoredPicture[];
}

export function partitionForServer(slideshow: StoredSlideshow): ServerPartition {
  return {
    linked: slideshow.pictures.filter((picture) => picture.immichAssetId !== undefined),
    deviceOnly: slideshow.pictures.filter((picture) => picture.immichAssetId === undefined),
  };
}

export interface SaveOnServerPorts {
  readonly client: CreatingClient;
  /** The device's store, holding the slideshow's music. */
  readonly store: Pick<SlideshowStore, "musicBlob">;
}

/**
 * "Save on the server": an independent copy of a device slideshow with its pictures from Immich,
 * those only on this device left out (`partitionForServer`), and its music uploaded.
 */
export async function saveOnServer(
  slideshow: StoredSlideshow,
  { client, store }: SaveOnServerPorts,
): Promise<StoredSlideshow> {
  const { linked } = partitionForServer(slideshow);
  if (linked.length === 0) {
    throw new Error(
      `slideshow "${slideshow.title}" has no picture from Immich; a server slideshow needs at least one`,
    );
  }
  const musicAudio =
    slideshow.music === undefined ? null : await store.musicBlob(slideshow.music.id);
  return createServerSlideshow({ ...slideshow, pictures: linked }, musicAudio, client);
}
