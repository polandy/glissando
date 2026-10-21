import type { MusicBeats } from "../src/beats/music-beats";
import type { MusicLoudness } from "../src/loudness/measure-loudness";
import type { StoredFocus } from "../src/library/picture-focus";
import type {
  LibraryRepository,
  MusicRecord,
  ShareLink,
  SlideshowRecord,
} from "./library-repository";

interface PictureFocusEntry {
  readonly stored: StoredFocus;
  readonly foundAt: number;
}

/** A `LibraryRepository` in memory, for the handler's tests. */
export function createMemoryRepository(): LibraryRepository {
  // Insertion order is the tiebreak of equal creation times.
  let slideshows = new Map<string, SlideshowRecord>();
  let music = new Map<string, MusicRecord>();
  let musicBeats = new Map<string, MusicBeats>();
  let musicLoudness = new Map<string, MusicLoudness>();
  let shareLinks = new Map<string, ShareLink>();
  let pictureFocus = new Map<string, PictureFocusEntry>();

  const isMusicReferenced = (id: string): boolean =>
    [...slideshows.values()].some(({ document }) =>
      document.slideshow.songs.some((song) => song.musicId === id),
    );

  const isPictureReferenced = (id: string): boolean =>
    [...slideshows.values()].some(({ document }) =>
      document.slideshow.pictures.some((picture) => picture.immichAssetId === id),
    );

  return {
    inTransaction(work) {
      const before = {
        slideshows: new Map(slideshows),
        music: new Map(music),
        musicBeats: new Map(musicBeats),
        musicLoudness: new Map(musicLoudness),
        shareLinks: new Map(shareLinks),
        pictureFocus: new Map(pictureFocus),
      };
      try {
        return work();
      } catch (error) {
        slideshows = before.slideshows;
        music = before.music;
        musicBeats = before.musicBeats;
        musicLoudness = before.musicLoudness;
        shareLinks = before.shareLinks;
        pictureFocus = before.pictureFocus;
        throw error;
      }
    },
    listSlideshows: () =>
      [...slideshows.values()].reverse().sort((a, b) => b.createdAt - a.createdAt),
    findSlideshow: (id) => slideshows.get(id),
    insertSlideshow(record) {
      slideshows.set(record.id, record);
    },
    updateSlideshow(id, revision, document) {
      const record = slideshows.get(id);
      if (record === undefined) {
        throw new Error(`no slideshow ${id} to update`);
      }
      slideshows.set(id, { ...record, revision, document });
    },
    deleteSlideshow(id) {
      slideshows.delete(id);
      shareLinks.delete(id);
    },
    share(id, link) {
      shareLinks.set(id, link);
    },
    unshare(id) {
      shareLinks.delete(id);
    },
    shareOf: (id) => shareLinks.get(id),
    slideshowByShareToken(token) {
      const shared = [...shareLinks].find(([, link]) => link.token === token);
      return shared === undefined ? undefined : slideshows.get(shared[0]);
    },
    findMusic: (id) => music.get(id),
    insertMusic(record) {
      music.set(record.id, record);
    },
    deleteMusic(id) {
      music.delete(id);
      musicBeats.delete(id);
      musicLoudness.delete(id);
    },
    findMusicBeats: (id) => musicBeats.get(id),
    putMusicBeats(id, beats) {
      musicBeats.set(id, beats);
    },
    findMusicLoudness: (id) => musicLoudness.get(id),
    putMusicLoudness(id, loudness) {
      musicLoudness.set(id, loudness);
    },
    restartMusicGrace(id, time) {
      const record = music.get(id);
      if (record !== undefined) {
        music.set(id, { ...record, uploadedAt: time });
      }
    },
    isMusicReferenced,
    unreferencedMusicUploadedBefore: (time) =>
      [...music.values()]
        .filter(({ id, uploadedAt }) => uploadedAt < time && !isMusicReferenced(id))
        .map(({ id }) => id),
    findPictureFocus(assetIds) {
      const found = new Map<string, StoredFocus>();
      for (const id of assetIds) {
        const entry = pictureFocus.get(id);
        if (entry !== undefined) {
          found.set(id, entry.stored);
        }
      }
      return found;
    },
    putPictureFocus(id, stored, foundAt) {
      const current = pictureFocus.get(id);
      if (current !== undefined && current.stored.detector > stored.detector) {
        return "newerKept";
      }
      pictureFocus.set(id, { stored, foundAt });
      return "stored";
    },
    isPictureReferenced,
    deletePictureFocus(id) {
      pictureFocus.delete(id);
    },
  };
}
