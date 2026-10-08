import { pictureKenBurns, slideDurationsMs } from "../../compose";
import type { OwnKenBurns } from "../../library/own-ken-burns";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { Size } from "../../player";

/** What the picture editor shows of one picture of a slideshow. */
export interface PictureEditorView {
  readonly id: string;
  /** The position in play order, from 1. */
  readonly number: number;
  readonly count: number;
  readonly fileName: string;
  /** ISO 8601 date-time. */
  readonly capturedAt: string;
  /** The stored picture's size in pixels. */
  readonly size: Size;
  /** The motion the picture plays: its own, or the automatic one for its position. */
  readonly motion: OwnKenBurns;
  readonly ownMotion: boolean;
  /** How long the picture's slide shows, so the preview plays the real motion. */
  readonly durationMs: number;
  /** As stored; empty without one. */
  readonly caption: string;
  /** The neighbours in play order; null at the ends. */
  readonly previousId: string | null;
  readonly nextId: string | null;
}

export function pictureEditorView(stored: StoredSlideshow, pictureId: string): PictureEditorView {
  const { pictures } = stored;
  const index = pictures.findIndex((picture) => picture.id === pictureId);
  const picture = pictures[index];
  if (picture === undefined) {
    throw new Error(`slideshow "${stored.id}" holds no picture "${pictureId}"`);
  }
  const { from, to } = pictureKenBurns(index, picture);
  const durationsMs = slideDurationsMs(
    pictures,
    stored.music?.durationMs,
    stored.secondsPerPicture,
  );
  return {
    id: picture.id,
    number: index + 1,
    count: pictures.length,
    fileName: picture.fileName,
    capturedAt: picture.capturedAt,
    size: { width: picture.width, height: picture.height },
    motion: { from, to },
    ownMotion: picture.kenBurns !== undefined,
    // One duration per picture: the index is in range.
    durationMs: durationsMs[index] as number,
    caption: picture.caption ?? "",
    previousId: pictures[index - 1]?.id ?? null,
    nextId: pictures[index + 1]?.id ?? null,
  };
}
