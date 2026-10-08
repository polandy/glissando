import type { SlideshowSources } from "../../compose";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import type { ObjectUrlPorts } from "./object-urls";

/** A slideshow's display pictures and music, read ahead so opening the player needs no wait. */
export interface PlayerMedia {
  readonly pictures: ReadonlyMap<string, Blob>;
  readonly music: Blob | null;
}

export async function loadPlayerMedia(
  store: Pick<LibraryStore, "pictureBlob" | "musicBlob">,
  stored: StoredSlideshow,
): Promise<PlayerMedia> {
  const pictures = await Promise.all(
    stored.pictures.map(
      async (picture) => [picture.id, await store.pictureBlob(picture.id)] as const,
    ),
  );
  const music = stored.music === undefined ? null : await store.musicBlob(stored.music.id);
  return { pictures: new Map(pictures), music };
}

/** Object URLs for one playing of the slideshow; `close` revokes every one of them. */
export function openPlayerMedia(
  media: PlayerMedia,
  urls: Pick<ObjectUrlPorts, "create" | "revoke">,
): { readonly sources: SlideshowSources; close(): void } {
  const pictureUrls = new Map([...media.pictures].map(([id, blob]) => [id, urls.create(blob)]));
  const musicUrl = media.music === null ? null : urls.create(media.music);

  return {
    sources: {
      picture(id) {
        const url = pictureUrls.get(id);
        if (url === undefined) {
          throw new Error(`picture "${id}" was not loaded for the player`);
        }
        return url;
      },
      music(id) {
        if (musicUrl === null) {
          throw new Error(`music "${id}" was not loaded for the player`);
        }
        return musicUrl;
      },
    },
    close() {
      for (const url of pictureUrls.values()) {
        urls.revoke(url);
      }
      if (musicUrl !== null) {
        urls.revoke(musicUrl);
      }
    },
  };
}
