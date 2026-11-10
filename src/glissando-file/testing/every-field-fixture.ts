import type {
  AddedChapter,
  ChapterEdit,
  StoredCard,
  StoredMusic,
  StoredPicture,
  StoredSlideshow,
} from "../../library/stored-slideshow";
import type { StoredVideo } from "../../library/own-video";
import type { StoredFocus } from "../../library/picture-focus";
import { FOCUS_DETECTOR_VERSION } from "../../focus/focus-detector-version";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { tinyPicture } from "./glissando-fixtures";

/**
 * `T` with every optional field required, so a field added to a stored type fails to compile
 * here until `EVERY_FIELD_SLIDESHOW` sets it — and the round trip then proves the file keeps it.
 */
type Complete<T> = { readonly [K in keyof T]-?: Exclude<T[K], undefined> };

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };

const VIDEO: Complete<StoredVideo> = {
  mediaId: "full-c1",
  sourceMs: 20_000,
  startMs: 1000,
  endMs: 6000,
  volume: 60,
  duckMusic: false,
};

/** Both origins are exclusive: the first picture came from Immich, the second from a file. */
const FIRST_PICTURE: Complete<Omit<StoredPicture, "fileBytes">> = {
  id: "full-p1",
  capturedAt: "2025-09-30T10:00:00Z",
  width: 40,
  height: 30,
  fileName: "a.jpg",
  kenBurns: {
    from: { zoom: 2, centerX: 0.25, centerY: 0.5 },
    to: { zoom: 1.25, centerX: 0.6, centerY: 0.4 },
  },
  caption: "Am Steg",
  durationMs: 8000,
  transition: "dissolve",
  immichAssetId: "asset-a1",
  alone: true,
  video: VIDEO,
  colours: COLOURS,
  place: { name: "Wien", latitude: 48.2085, longitude: 16.3721 },
};

const SECOND_PICTURE: StoredPicture & Pick<Complete<StoredPicture>, "fileBytes"> = {
  id: "full-p2",
  capturedAt: "2025-10-02T10:00:00Z",
  width: 40,
  height: 30,
  fileName: "b.jpg",
  fileBytes: 2_500_000,
  colours: COLOURS,
};

const SONG: Complete<StoredMusic> = {
  id: "full-m1",
  fileName: "Walzer.m4a",
  durationMs: 240_000,
  mimeType: "audio/mp4",
  trim: { startMs: 12_000, endMs: 200_000 },
  fadeInMs: 2000,
  fadeOutMs: 5000,
  pictureChanges: "even",
  volumeDb: -3,
  sampleTrack: "walzer-in-a",
};

const OPENING_CARD: Complete<StoredCard> = {
  title: "Herbst in Wien",
  subtitle: "2025",
  style: "classic",
  position: "bottom-left",
  entrance: "letters",
  background: { kind: "picture", pictureId: "full-p2", fade: 60, tint: "dark" },
  motion: true,
};

const CLOSING_CARD: Complete<StoredCard> = {
  title: "Ende",
  subtitle: "Danke",
  style: "quiet",
  position: "centre",
  entrance: "slow-fade",
  background: { kind: "colour", colour: "night" },
  motion: false,
};

const CHAPTER_EDIT: Complete<ChapterEdit> = {
  pictureId: "full-p2",
  title: "Zweiter Tag",
  subtitle: "Am Fluss",
  hidden: true,
};

const ADDED_CHAPTER: Complete<AddedChapter> = {
  beforePictureId: "full-p1",
  title: "Anreise",
  subtitle: "Mit dem Zug",
};

/** A slideshow with every optional field of the stored types set, nested ones included. */
export const EVERY_FIELD_SLIDESHOW: Complete<StoredSlideshow> = {
  id: "full-show",
  title: "Alles drin",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [FIRST_PICTURE, SECOND_PICTURE],
  ownOrder: true,
  songs: [SONG],
  betweenSongs: "sequence",
  repeatMusic: true,
  secondsPerPicture: 6,
  pictureLength: "seconds",
  transition: "alternate",
  look: "warm",
  mood: "calm",
  energyPacing: true,
  portraitPictures: "fill-screen",
  openingCard: OPENING_CARD,
  closingCard: CLOSING_CARD,
  automaticChaptersOff: true,
  chapterEdits: [CHAPTER_EDIT],
  addedChapters: [ADDED_CHAPTER],
};

/** The focus stored for each picture of `EVERY_FIELD_SLIDESHOW`, one of each kind of result. */
export const EVERY_FIELD_FOCUS: ReadonlyMap<string, StoredFocus> = new Map([
  [
    FIRST_PICTURE.id,
    {
      focus: {
        kind: "subject",
        box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
        foundBy: "immich-faces",
      },
      detector: FOCUS_DETECTOR_VERSION,
    },
  ],
  [SECOND_PICTURE.id, { focus: { kind: "scenery" }, detector: FOCUS_DETECTOR_VERSION }],
]);

/** A store holding every medium and focus `EVERY_FIELD_SLIDESHOW` names. */
export async function everyFieldStore(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  for (const { id } of EVERY_FIELD_SLIDESHOW.pictures) {
    await store.putPicture(id, {
      display: tinyPicture(`display ${id}`),
      thumbnail: tinyPicture(`thumb ${id}`),
    });
  }
  await store.putVideo(VIDEO.mediaId, new Blob(["clip"], { type: "video/mp4" }));
  await store.putMusic(SONG.id, new Blob(["music"], { type: SONG.mimeType }));
  for (const [pictureId, stored] of EVERY_FIELD_FOCUS) {
    await store.putPictureFocus(pictureId, stored);
  }
  return store;
}
