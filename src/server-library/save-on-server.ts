import type { SlideshowStore } from "../library/library-store";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { serverDocumentFor, storedSlideshowFrom } from "./server-document";
import type { ServerLibraryClient } from "./server-library-client";

type CreatingClient = Pick<ServerLibraryClient, "uploadMusic" | "createSlideshow">;
type FocusPuttingClient = Pick<ServerLibraryClient, "putPictureFocus">;

/**
 * Creates `slideshow` on the server (its id and its songs' ids are ignored): uploads every
 * song's audio first, in play order, then the document. Answers the slideshow as the server
 * keeps it.
 */
export async function createServerSlideshow(
  slideshow: StoredSlideshow,
  songsAudio: readonly Blob[],
  client: CreatingClient,
): Promise<StoredSlideshow> {
  const document = serverDocumentFor({
    ...slideshow,
    songs: await uploadedSongs(slideshow, songsAudio, client),
  });
  const { id } = await client.createSlideshow(document);
  return storedSlideshowFrom(id, document);
}

/** The playlist named by the server's id once every song's audio is uploaded. */
async function uploadedSongs(
  { songs }: StoredSlideshow,
  songsAudio: readonly Blob[],
  client: CreatingClient,
): Promise<StoredSlideshow["songs"]> {
  if (songsAudio.length !== songs.length) {
    throw new Error(
      `the playlist has ${songs.length} song(s) but ${songsAudio.length} audio blob(s) were given`,
    );
  }
  const uploaded: StoredSlideshow["songs"][number][] = [];
  for (const [index, song] of songs.entries()) {
    const audio = songsAudio[index];
    if (audio === undefined) {
      throw new Error(`song ${index} ("${song.fileName}") needs its audio to be uploaded`);
    }
    uploaded.push({ ...song, id: await client.uploadMusic(audio, song.mimeType) });
  }
  return uploaded;
}

export interface ServerPartition {
  /** Pictures from Immich, which a server slideshow links. */
  readonly linked: readonly StoredPicture[];
  /**
   * Pictures only on this device, which a server slideshow cannot hold (ADR-0018): a video
   * slide too, whatever its poster's origin, since the server keeps no clip.
   */
  readonly deviceOnly: readonly StoredPicture[];
}

function isLinkable(picture: StoredPicture): boolean {
  return picture.immichAssetId !== undefined && picture.video === undefined;
}

export function partitionForServer(slideshow: StoredSlideshow): ServerPartition {
  return {
    linked: slideshow.pictures.filter(isLinkable),
    deviceOnly: slideshow.pictures.filter((picture) => !isLinkable(picture)),
  };
}

export interface SaveOnServerPorts {
  readonly client: CreatingClient & FocusPuttingClient;
  /** The device's store, holding the slideshow's music and each picture's stored focus. */
  readonly store: Pick<SlideshowStore, "musicBlob" | "pictureFocus">;
  /** Where a focus PUT that could not reach the server is logged; the save itself still succeeds. */
  log(error: unknown): void;
}

/**
 * "Save on the server": an independent copy of a device slideshow with its pictures from Immich,
 * those only on this device left out (`partitionForServer`), and its playlist uploaded. Once the
 * copy exists on the server, a picture's focus already stored on this device is put there too, so
 * the server's own focus pass need not find it again; a picture with none is left for that pass.
 * A focus PUT that cannot reach the server is logged, not thrown: the save has already succeeded.
 */
export async function saveOnServer(
  slideshow: StoredSlideshow,
  { client, store, log }: SaveOnServerPorts,
): Promise<StoredSlideshow> {
  const { linked } = partitionForServer(slideshow);
  if (linked.length === 0) {
    throw new Error(
      `slideshow "${slideshow.title}" has no picture from Immich; a server slideshow needs at least one`,
    );
  }
  const songsAudio = await Promise.all(slideshow.songs.map((song) => store.musicBlob(song.id)));
  const saved = await createServerSlideshow({ ...slideshow, pictures: linked }, songsAudio, client);
  await putStoredFocus(saved.id, linked, { client, store, log });
  return saved;
}

/** Puts each linked picture's device-stored focus on the server slideshow just created. */
async function putStoredFocus(
  slideshowId: string,
  linked: readonly StoredPicture[],
  { client, store, log }: SaveOnServerPorts,
): Promise<void> {
  const focusByDeviceId = await store.pictureFocus(linked.map((picture) => picture.id));
  await Promise.all(
    linked.flatMap((picture) => {
      const stored = focusByDeviceId.get(picture.id);
      if (stored === undefined || picture.immichAssetId === undefined) return [];
      return [
        client
          .putPictureFocus(slideshowId, picture.immichAssetId, stored)
          .catch((error: unknown) => log(error)),
      ];
    }),
  );
}
