import type { MusicBeats } from "../src/beats/music-beats";
import type { LibraryRepository, MusicRecord, SlideshowRecord } from "./library-repository";

/** A `LibraryRepository` in memory, for the handler's tests. */
export function createMemoryRepository(): LibraryRepository {
  // Insertion order is the tiebreak of equal creation times.
  let slideshows = new Map<string, SlideshowRecord>();
  let music = new Map<string, MusicRecord>();
  let musicBeats = new Map<string, MusicBeats>();

  const isMusicReferenced = (id: string): boolean =>
    [...slideshows.values()].some(({ document }) => document.slideshow.music?.musicId === id);

  return {
    inTransaction(work) {
      const before = {
        slideshows: new Map(slideshows),
        music: new Map(music),
        musicBeats: new Map(musicBeats),
      };
      try {
        return work();
      } catch (error) {
        slideshows = before.slideshows;
        music = before.music;
        musicBeats = before.musicBeats;
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
    },
    findMusic: (id) => music.get(id),
    insertMusic(record) {
      music.set(record.id, record);
    },
    deleteMusic(id) {
      music.delete(id);
      musicBeats.delete(id);
    },
    findMusicBeats: (id) => musicBeats.get(id),
    putMusicBeats(id, beats) {
      musicBeats.set(id, beats);
    },
    isMusicReferenced,
    unreferencedMusicUploadedBefore: (time) =>
      [...music.values()]
        .filter(({ id, uploadedAt }) => uploadedAt < time && !isMusicReferenced(id))
        .map(({ id }) => id),
  };
}
