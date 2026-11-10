import { describe, expect, it } from "vitest";
import { MAX_OWN_KEN_BURNS_ZOOM } from "../library/own-ken-burns";
import { MAX_MUSIC_FADE_MS, MUSIC_VOLUME_MAX_DB, MUSIC_VOLUME_MIN_DB } from "../library/own-music";
import {
  MAX_OWN_DURATION_MS,
  MIN_OWN_DURATION_MS,
  SLIDESHOW_TRANSITIONS,
  TRANSITION_CHOICES,
} from "../library/own-timing";
import { MAX_VIDEO_VOLUME } from "../library/own-video";
import { SUBJECT_FINDERS, type StoredFocus } from "../library/picture-focus";
import { PORTRAIT_PICTURES_CHOICES } from "../library/portrait-pictures";
import { CARD_TINTS } from "../library/stored-card";
import {
  MAX_SECONDS_PER_PICTURE,
  MIN_SECONDS_PER_PICTURE,
  SECONDS_PER_PICTURE_STEP,
  type StoredCard,
  type StoredMusic,
  type StoredPicture,
  type StoredSlideshow,
} from "../library/stored-slideshow";
import { SLIDESHOW_MOODS } from "../library/slideshow-mood";
import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { CARD_SWATCHES, type CardSwatchId } from "../player/card-palette";
import { GRADED_SLIDESHOW_LOOKS } from "../player/looks/slideshow-look";
import { CARD_ENTRANCES, CARD_POSITIONS, CARD_STYLES } from "../player/slideshow";
import { SAMPLE_TRACKS } from "../sample-music/sample-tracks";
import { EVERY_FIELD_SLIDESHOW, everyFieldStore } from "./testing/every-field-fixture";
import { asOriginal, originalIds, roundTrip } from "./testing/round-trip";

const SHOW = EVERY_FIELD_SLIDESHOW;
const [FIRST, SECOND] = SHOW.pictures as readonly [StoredPicture, StoredPicture];
const [SONG] = SHOW.songs as readonly [StoredMusic];
const CARD = SHOW.openingCard;
const VIDEO = FIRST.video;
if (CARD === undefined || VIDEO === undefined) throw new Error("the fixture sets both");
const { mediaId, sourceMs, startMs, endMs } = VIDEO;

const withFirst = (picture: Partial<StoredPicture>): StoredSlideshow => ({
  ...SHOW,
  pictures: [{ ...FIRST, ...picture }, SECOND],
});
const withSong = (song: Partial<StoredMusic>): StoredSlideshow => ({
  ...SHOW,
  songs: [{ ...SONG, ...song }],
});
const withCard = (card: Partial<StoredCard>): StoredSlideshow => ({
  ...SHOW,
  openingCard: { ...CARD, ...card },
});

/** Each case changes one setting of the every-field slideshow to a value of its whole range. */
const CASES: readonly (readonly [string, StoredSlideshow])[] = [
  ...TRANSITION_CHOICES.map(
    (transition) => [`picture transition ${transition}`, withFirst({ transition })] as const,
  ),
  ...SLIDESHOW_TRANSITIONS.map(
    (transition) => [`default transition ${transition}`, { ...SHOW, transition }] as const,
  ),
  ...GRADED_SLIDESHOW_LOOKS.map((look) => [`look ${look}`, { ...SHOW, look }] as const),
  ...SLIDESHOW_MOODS.map((mood) => [`mood ${mood}`, { ...SHOW, mood }] as const),
  ...PORTRAIT_PICTURES_CHOICES.map(
    (portraitPictures) =>
      [`portrait pictures ${portraitPictures}`, { ...SHOW, portraitPictures }] as const,
  ),
  ...CARD_STYLES.map((style) => [`card style ${style}`, withCard({ style })] as const),
  ...CARD_POSITIONS.map(
    (position) => [`card position ${position}`, withCard({ position })] as const,
  ),
  ...CARD_ENTRANCES.map(
    (entrance) => [`card entrance ${entrance}`, withCard({ entrance })] as const,
  ),
  ...CARD_TINTS.map(
    (tint) =>
      [
        `card tint ${tint}`,
        withCard({ background: { kind: "picture", pictureId: SECOND.id, fade: 35, tint } }),
      ] as const,
  ),
  ...(Object.keys(CARD_SWATCHES) as CardSwatchId[]).map(
    (colour) =>
      [`card swatch ${colour}`, withCard({ background: { kind: "colour", colour } })] as const,
  ),
  ["card picture colour", withCard({ background: { kind: "colour", colour: "#1A2b3C" } })],
  ["card without a subtitle", withCard({ subtitle: undefined })],
  [
    "card fade 0",
    withCard({ background: { kind: "picture", pictureId: FIRST.id, fade: 0, tint: "light" } }),
  ],
  [
    "card fade 100",
    withCard({ background: { kind: "picture", pictureId: FIRST.id, fade: 100, tint: "light" } }),
  ],
  ["closing card on a picture", { ...SHOW, closingCard: { ...CARD, title: "Ende" } }],
  ...SAMPLE_TRACKS.map(({ id }) => [`sample track ${id}`, withSong({ sampleTrack: id })] as const),
  ["fades off", withSong({ fadeInMs: 0, fadeOutMs: 0 })],
  ["longest fades", withSong({ fadeInMs: MAX_MUSIC_FADE_MS, fadeOutMs: MAX_MUSIC_FADE_MS })],
  ["quietest song", withSong({ volumeDb: MUSIC_VOLUME_MIN_DB })],
  ["loudest song", withSong({ volumeDb: MUSIC_VOLUME_MAX_DB })],
  [
    "two songs in an own order",
    { ...SHOW, songs: [{ ...SONG, id: "full-m2", fileName: "Zweiter.mp3" }, SONG] },
  ],
  ["shortest own duration", withFirst({ durationMs: MIN_OWN_DURATION_MS })],
  ["longest own duration", withFirst({ durationMs: MAX_OWN_DURATION_MS })],
  ["fewest seconds per picture", { ...SHOW, secondsPerPicture: MIN_SECONDS_PER_PICTURE }],
  ["most seconds per picture", { ...SHOW, secondsPerPicture: MAX_SECONDS_PER_PICTURE }],
  [
    "half seconds per picture",
    { ...SHOW, secondsPerPicture: MIN_SECONDS_PER_PICTURE + SECONDS_PER_PICTURE_STEP },
  ],
  [
    "strongest own motion",
    withFirst({
      kenBurns: {
        from: { zoom: MAX_OWN_KEN_BURNS_ZOOM, centerX: 0, centerY: 1 },
        to: { zoom: 1, centerX: 1, centerY: 0 },
      },
    }),
  ],
  ["caption beyond Latin", withFirst({ caption: "Café 東京 👨‍👩‍👧 am Meer" })],
  [
    "silent clip ducking the music",
    withFirst({ video: { mediaId, sourceMs, startMs, endMs, volume: 0 } }),
  ],
  ["loudest clip", withFirst({ video: { ...VIDEO, volume: MAX_VIDEO_VOLUME } })],
  ["whole clip", withFirst({ video: { ...VIDEO, startMs: 0, endMs: VIDEO.sourceMs } })],
  ["pictures against their capture order", { ...SHOW, pictures: [SECOND, FIRST] }],
  ["chapter edit hiding only", { ...SHOW, chapterEdits: [{ pictureId: SECOND.id, hidden: true }] }],
  [
    "chapter edit of the title only",
    { ...SHOW, chapterEdits: [{ pictureId: SECOND.id, title: "Nur Titel" }] },
  ],
  ["added chapter without text", { ...SHOW, addedChapters: [{ beforePictureId: SECOND.id }] }],
];

/** Each kind of focus result, stored for the first picture. */
const FOCUS_CASES: readonly StoredFocus[] = [
  ...SUBJECT_FINDERS.map(
    (foundBy) =>
      ({
        focus: { kind: "subject", box: { x: 0, y: 0.5, width: 1, height: 0.5 }, foundBy },
        detector: FOCUS_DETECTOR_VERSION,
      }) as const,
  ),
  { focus: { kind: "none" }, detector: FOCUS_DETECTOR_VERSION },
  { focus: { kind: "scenery" }, detector: FOCUS_DETECTOR_VERSION - 1 },
];

describe("a .glissando file round trip keeps every value a setting can take", () => {
  it.each(CASES)("%s", async (_name, slideshow) => {
    const store = await everyFieldStore();
    if (slideshow.songs.length > 1) {
      await store.putMusic("full-m2", new Blob(["second song"], { type: SONG.mimeType }));
    }

    const copy = await roundTrip(slideshow, store);

    expect(asOriginal(copy, slideshow)).toEqual(slideshow);
  });

  it.each(FOCUS_CASES)("focus %j", async (stored) => {
    const store = await everyFieldStore();
    await store.putPictureFocus(FIRST.id, stored);

    const copy = await roundTrip(SHOW, store);

    const firstCopyId = [...originalIds(copy, SHOW)].find(([, id]) => id === FIRST.id)?.[0] ?? "";
    expect((await store.pictureFocus([firstCopyId])).get(firstCopyId)).toEqual(stored);
  });
});
