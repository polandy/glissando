import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import {
  MIN_KEN_BURNS_ZOOM,
  SLIDESHOW_FORMAT_VERSION,
  type Framing,
  type KenBurns,
  type Slide,
  type Slideshow,
  type SlideVideo,
} from "../player/slideshow";
import { DEFAULT_VIDEO_VOLUME, type StoredVideo } from "../library/own-video";
import { isGradedLook } from "../player/looks/slideshow-look";
import { beatTransitionDurationMs } from "./beat-transition";
import { composeCards } from "./compose-cards";
import { composeChapters } from "./compose-chapters";
import { composedChapters } from "./chapters-of-slideshow";
import { playlistEnergy } from "./energy/playlist-energy";
import { picturesFillMs, targetSecondsPerPicture } from "./filled-length";
import { insertedTimeFor, realOffsetsMs } from "./inserted-time";
import { moodSettings, moodTempo } from "./mood-settings";
import { playlistBeatsMs, playlistMs, resolvePlaylist, type SongBeats } from "./playlist";
import { pairKenBurns, pictureKenBurns } from "./picture-ken-burns";
import { pictureTransition, slideshowTransition } from "./picture-transition";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit, type SlideUnit } from "./slide-units";
import { slideshowLook } from "./slideshow-look";
import type { SongLoudness } from "./song-loudness";
import { trackGain } from "./track-gain";

/** A song not yet given its own volume plays at the levelling alone. */
const DEFAULT_OWN_VOLUME_DB = 0;

/** Resolves a stored picture, music or video (`StoredVideo.mediaId`) id to the URL the player loads it from. */
export interface SlideshowSources {
  picture(id: string): string;
  music(id: string): string;
  video(mediaId: string): string;
}

/** A video slide holds still: the clip is the motion. */
const STILL_FRAMING: Framing = { zoom: MIN_KEN_BURNS_ZOOM, centerX: 0.5, centerY: 0.5 };
const STILL_KEN_BURNS: KenBurns = { from: STILL_FRAMING, to: STILL_FRAMING, easing: "linear" };
const PERCENT = 100;

/** `Slide.fit`, written for every slide while the layout gives every picture the crop (ADR-0028). */
const COVER_FIT = "cover";

/**
 * Composes the playable slideshow JSON from a stored slideshow, applying the automatic choices
 * wherever the user made none of their own. Two consecutive portrait pictures become one slide,
 * unless `stored.portraitPictures` turns that off (`slideUnits`, ADR-0028). An automatic motion
 * aims at a picture's `focus`, by picture id; a picture absent from it was not looked at yet. The
 * pictures change on the songs' `beats` found so far, by music id; a song absent from it gives
 * none (ADR-0021, ADR-0023). Each track's `gain` levels its excerpt by the songs' `loudness`
 * measured so far, by music id; a song absent from it plays at its own volume alone (ADR-0040).
 * `locale` picks the language of a trip chapter's automatic text (`TRIP_CHAPTERS.md`).
 */
export function composeSlideshow(
  stored: StoredSlideshow,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  beats: SongBeats,
  loudness: SongLoudness,
  locale: string,
): Slideshow {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const mood =
    stored.mood === undefined ? undefined : moodSettings(stored.mood, moodTempo(stored, beats));
  const defaultTransition = mood?.transition ?? slideshowTransition(stored);
  const look = slideshowLook(stored);
  const timedPictures = units.map((unit) => timedUnit(stored.pictures, unit));
  const target = targetSecondsPerPicture(
    stored.pictureLength,
    stored.secondsPerPicture,
    mood?.secondsPerPicture,
  );
  // The pictures fill the playlist in fill mode, or fit a shorter one at their own or mood
  // seconds, unless the music repeats instead of them shrinking (ADR-0022, ADR-0045, ADR-0047).
  const filledMs = picturesFillMs(playlistMs(stored), timedPictures, target, stored.repeatMusic);
  const secondsPerPicture = target ?? stored.secondsPerPicture;
  // Roughly how long the slideshow plays, ahead of the beat snap and the cards below, so a
  // repeating playlist's beats and energy reach far enough into the repeats (`repeatedPlaylist`);
  // off by at most what the beat snap and the cards add, well inside a repeat's own margin.
  const approxSlideshowMs = slideDurationsMs(timedPictures, filledMs, secondsPerPicture).reduce(
    (sum, durationMs) => sum + durationMs,
    0,
  );
  const beatsMs = playlistBeatsMs(stored, beats, approxSlideshowMs);
  const energy =
    stored.energyPacing === true
      ? playlistEnergy(stored, loudness, beats, approxSlideshowMs)
      : undefined;
  const chapters = composedChapters(stored, locale);
  // How much the opening card and the chapters add around a slide unit, before the beat and
  // energy math below runs — the beats, energy and lifts are already in that real playlist time
  // (`insertedTimeFor`).
  const inserted = insertedTimeFor(
    stored.openingCard,
    chapters,
    stored.pictures,
    units,
    beatsMs,
    defaultTransition,
    mood?.transitionShare,
    mood?.maxTransitionMs,
  );
  const insertedOffsets = realOffsetsMs(inserted, units.length);
  const durationsMs = slideDurationsMs(
    timedPictures,
    filledMs,
    secondsPerPicture,
    beatsMs,
    energy,
    inserted,
  );
  const fit = stored.portraitPictures === "fill-screen" ? COVER_FIT : undefined;
  let slideEndMs = 0;

  const slides: Slide[] = units.map((unit, index) => {
    // durationsMs has exactly one entry per slide unit; the index is always in range.
    const durationMs = durationsMs[index] as number;
    slideEndMs += durationMs;
    // The slide's real end in playlist ms, counting whatever the opening card or a chapter adds
    // around it — the lift check and the beat-aligned transition below both read the playlist.
    const realSlideEndMs = slideEndMs + (insertedOffsets.endMs[index] as number);
    const slide = slideFor(
      index,
      stored.pictures,
      unit,
      sources,
      focus,
      durationMs,
      fit,
      mood?.kenBurnsStrength,
    );
    const picture = pictureOf(stored.pictures, unit.pictureIndices[0]);
    const transitionToNext = pictureTransition(
      index,
      units.length,
      picture,
      durationMs,
      defaultTransition,
      mood?.transitionShare,
      mood?.maxTransitionMs,
    );
    if (transitionToNext === undefined) {
      return slide;
    }
    // A cut at a drop or chorus, unless the picture keeps its own transition (ADR-0046).
    if (picture.transition === undefined && energy?.liftsMs.includes(realSlideEndMs) === true) {
      return slide;
    }
    if (beatsMs === undefined) {
      return { ...slide, transitionToNext };
    }
    const onBeatMs = beatTransitionDurationMs(realSlideEndMs, transitionToNext.durationMs, beatsMs);
    return { ...slide, transitionToNext: { ...transitionToNext, durationMs: onBeatMs } };
  });

  const withCards = composeCards(stored, units, slides, sources, focus, defaultTransition, beatsMs);
  const withChapters = composeChapters(
    chapters,
    stored.pictures,
    withCards.slides,
    sources,
    focus,
    defaultTransition,
  );
  const slideshowMs = withChapters.reduce((sum, finalSlide) => sum + finalSlide.durationMs, 0);
  const music = resolvePlaylist(stored, slideshowMs, withCards.endFadeMs).map(
    ({ song, ...timing }) => ({
      src: sources.music(song.id),
      ...timing,
      gain: trackGain({
        loudness: loudness.get(song.id),
        startMs: timing.startMs,
        endMs: timing.endMs,
        ownDb: song.volumeDb ?? DEFAULT_OWN_VOLUME_DB,
      }),
    }),
  );
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title: stored.title,
    ...(music.length === 0 ? {} : { music }),
    slides: withChapters,
    ...(withCards.endFadeMs === undefined ? {} : { endFadeMs: withCards.endFadeMs }),
    ...(isGradedLook(look) ? { look } : {}),
  };
}

function pictureOf(pictures: readonly StoredPicture[], index: number): StoredPicture {
  return pictures[index] as StoredPicture;
}

function slideFor(
  index: number,
  pictures: readonly StoredPicture[],
  unit: SlideUnit,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  durationMs: number,
  fit: typeof COVER_FIT | undefined,
  /** A mood's own Ken Burns strength, in place of the default (ADR-0045). */
  kenBurnsStrength?: number,
): Slide {
  const first = pictureOf(pictures, unit.pictureIndices[0]);
  const firstFocus = focus.get(first.id);
  const partnerIndex = unit.pictureIndices[1];
  if (partnerIndex === undefined) {
    return {
      image: { src: sources.picture(first.id), capturedAt: first.capturedAt },
      durationMs,
      kenBurns:
        first.video === undefined
          ? pictureKenBurns(index, first, firstFocus, kenBurnsStrength)
          : STILL_KEN_BURNS,
      ...(first.video === undefined ? {} : { video: videoOf(first.video, sources) }),
      ...(first.caption === undefined ? {} : { caption: first.caption }),
      ...(fit === undefined ? {} : { fit }),
    };
  }
  const second = pictureOf(pictures, partnerIndex);
  const motion = pairKenBurns(
    index,
    first,
    firstFocus,
    second,
    focus.get(second.id),
    kenBurnsStrength,
  );
  return {
    image: { src: sources.picture(first.id), capturedAt: first.capturedAt },
    durationMs,
    kenBurns: motion.first,
    partner: {
      image: { src: sources.picture(second.id), capturedAt: second.capturedAt },
      kenBurns: motion.second,
    },
    ...(fit === undefined ? {} : { fit }),
  };
}

function videoOf(video: StoredVideo, sources: SlideshowSources): SlideVideo {
  return {
    src: sources.video(video.mediaId),
    startMs: video.startMs,
    endMs: video.endMs,
    volume: (video.volume ?? DEFAULT_VIDEO_VOLUME) / PERCENT,
    ...(video.duckMusic === false ? { duckMusic: false } : {}),
  };
}
