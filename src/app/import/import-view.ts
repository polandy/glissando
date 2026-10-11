import type { ConvertibleSource } from "../../import/music-format";
import { musicExcerptMs, placeSongs, playlistMs, slideDurationsMs } from "../../compose";
import type { PictureImportState, SkipReason, SkippedFile } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../../player";
import type { PlaylistSongView } from "../music-editor/playlist-view";
import type { ChosenSong } from "./import-session";
import type { CullingState } from "./picture-culling";

/**
 * What step 1 shows: the drop zone, the live progress, the chosen pictures, or a failed import,
 * which takes no more files until it is started over.
 */
export type PicturesPhase = "empty" | "importing" | "done" | "failed";

export function picturesPhase(state: PictureImportState): PicturesPhase {
  if (state.failed) {
    return "failed";
  }
  if (state.busy) {
    return "importing";
  }
  return state.pictures.length > 0 ? "done" : "empty";
}

/** Files accepted but not yet processed: step 1 shows a placeholder tile for each. */
export function pendingPictureCount(state: PictureImportState): number {
  return state.busy ? state.total - state.done : 0;
}

/**
 * "Next" waits until every picture is downscaled and checked for similar shots and blur
 * (dev-docs/SCOPE.md, interaction rules).
 */
export function canContinue(state: PictureImportState, culling: CullingState): boolean {
  return !state.busy && culling.checking === null && !state.failed && state.pictures.length > 0;
}

/** Whether leaving step 1 would throw away something the user chose. */
export function hasSelection(state: PictureImportState): boolean {
  return state.busy || state.pictures.length > 0;
}

/** The names of the skipped files by what step 1 tells about them. */
export interface SkippedNotices {
  /** Not a picture, or one the browser cannot read. */
  readonly unreadable: readonly string[];
  /** Photos Immich could not deliver. */
  readonly notDownloaded: readonly string[];
  /** Pictures already in the slideshow being added to, which "Add anyway" takes in after all. */
  readonly alreadyIn: readonly string[];
  /** Pictures this import already took in, which "Add anyway" takes in after all. */
  readonly chosenTwice: readonly string[];
}

export function skippedNotices(skipped: readonly SkippedFile[]): SkippedNotices {
  const namesFor = (matches: (reason: SkipReason) => boolean): string[] =>
    skipped.filter((file) => matches(file.reason)).map((file) => file.fileName);
  return {
    unreadable: namesFor((reason) => reason === "unsupported" || reason === "unreadable"),
    notDownloaded: namesFor((reason) => reason === "notDownloaded"),
    alreadyIn: namesFor((reason) => reason === "alreadyIn"),
    chosenTwice: namesFor((reason) => reason === "chosenTwice"),
  };
}

/** First and last capture date of pictures already in capture order. */
export function captureRange(
  pictures: readonly StoredPicture[],
): { readonly from: string; readonly to: string } | null {
  const first = pictures[0];
  const last = pictures.at(-1);
  return first === undefined || last === undefined
    ? null
    : { from: first.capturedAt, to: last.capturedAt };
}

/** The chosen music of a slideshow about to be created, and whether its pictures fill it. */
export interface ImportMusic {
  readonly durationMs: number;
  readonly filled: boolean;
}

/** How the music meets the slideshow: it ends with it, fades out at its end, or ends first. */
export type ImportMusicFit = "ends-with" | "fades-out" | "silent-after";

export interface ImportTiming {
  readonly perPictureSeconds: number;
  readonly totalSeconds: number;
  /** The music's length and how it meets the slideshow; null without music. */
  readonly music: { readonly kind: ImportMusicFit; readonly seconds: number } | null;
}

/**
 * The slide durations of a slideshow about to be created: none of its pictures has an own one,
 * and the music's beats are not known yet.
 */
export function importSlideDurationsMs(
  pictureCount: number,
  music: ImportMusic | undefined,
  secondsPerPicture: number,
): number[] {
  const pictures = Array.from({ length: pictureCount }, () => ({}));
  const filledMs = music?.filled === true ? music.durationMs : undefined;
  return slideDurationsMs(pictures, filledMs, secondsPerPicture);
}

/** Step 2's timing row, by the same rule the slideshow is composed with. */
export function importTiming(
  pictureCount: number,
  music: ImportMusic | undefined,
  secondsPerPicture: number,
): ImportTiming {
  const totalMs = importSlideDurationsMs(pictureCount, music, secondsPerPicture).reduce(
    (sum, durationMs) => sum + durationMs,
    0,
  );
  return {
    perPictureSeconds: totalMs / pictureCount / MILLISECONDS_PER_SECOND,
    totalSeconds: totalMs / MILLISECONDS_PER_SECOND,
    music:
      music === undefined
        ? null
        : {
            kind: musicFit(totalMs, music.durationMs),
            seconds: music.durationMs / MILLISECONDS_PER_SECOND,
          },
  };
}

function musicFit(slideshowMs: number, musicMs: number): ImportMusicFit {
  if (slideshowMs > musicMs) {
    return "silent-after";
  }
  return slideshowMs < musicMs ? "fades-out" : "ends-with";
}

/** Step 2's songs as the slideshow will play them; a song's id is its key. */
export interface ImportPlaylist {
  readonly songs: readonly PlaylistSongView[];
  /** What "Fill the music" fills; 0 without songs. */
  readonly playlistMs: number;
}

/**
 * The chosen songs placed as the composer places them, crossfading (ADR-0023), against a
 * slideshow `slideshowMs` long.
 */
export function importPlaylist(songs: readonly ChosenSong[], slideshowMs: number): ImportPlaylist {
  const playlist = {
    songs: songs.map((song) => ({
      id: String(song.key),
      fileName: song.pickedName,
      durationMs: song.durationMs,
      mimeType: song.file.type,
    })),
  };
  return {
    songs: placeSongs(playlist).map(({ song, atMs }, index) => ({
      id: song.id,
      number: index + 1,
      fileName: song.fileName,
      durationMs: song.durationMs,
      excerptMs: musicExcerptMs(song),
      trimmed: false,
      atMs,
      reached: atMs < slideshowMs,
    })),
    playlistMs: playlistMs(playlist) ?? 0,
  };
}

/** A short format name for the track card: the file extension, else the type's subtype. */
export function musicFormatLabel(fileName: string, mimeType: string): string {
  const dot = fileName.lastIndexOf(".");
  const extension = dot < 0 ? "" : fileName.slice(dot + 1);
  const subtype = mimeType.split("/")[1] ?? "";
  return (extension || subtype).toUpperCase();
}

/** Format names, the same in every language. */
const CONVERTIBLE_SOURCE_LABELS: Readonly<Record<ConvertibleSource, string>> = {
  alac: "Apple Lossless",
  aiff: "AIFF",
  caf: "CAF",
  ac3: "AC-3",
  eac3: "E-AC-3",
  wma: "WMA",
  amr: "AMR",
  vorbis: "Ogg Vorbis",
};

export function convertibleSourceLabel(source: ConvertibleSource): string {
  return CONVERTIBLE_SOURCE_LABELS[source];
}
