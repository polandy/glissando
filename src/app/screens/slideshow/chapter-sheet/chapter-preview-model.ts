import { DEFAULT_CARD_FADE } from "../../../../library/stored-card";
import { inkFor } from "../../../../player/card-palette";
import type { Card } from "../../../../player/slideshow";
import type { SlideshowChapter } from "../../../../compose/chapters-of-slideshow";
import type { PictureTile } from "../../view-models";

/**
 * A chapter's card as the player draws it (Rule F, `TRIP_CHAPTERS.md`): the same "quiet" style
 * and veil `compose-chapters.ts` builds for the real slide, from the picture's own veil colour
 * already carried on its tile. Pure: no DOM, so it is unit-tested directly.
 */

export interface ChapterPreviewFace {
  readonly card: Card;
  readonly pictureUrl: string;
}

/**
 * `chapter`'s preview face; its anchor picture is always among `pictures` (the sheet only opens
 * for a chapter the strip already shows).
 */
export function chapterPreviewFace(
  chapter: SlideshowChapter,
  pictures: readonly PictureTile[],
): ChapterPreviewFace {
  const picture = pictures.find((candidate) => candidate.id === chapter.anchorPictureId);
  if (picture === undefined) {
    throw new Error(`chapter anchors picture "${chapter.anchorPictureId}", not one of the strip's`);
  }
  const veilColour = picture.colours.veil;
  const card: Card = {
    title: chapter.title,
    subtitle: chapter.subtitle,
    style: "quiet",
    position: "bottom-left",
    ink: inkFor(veilColour),
    entrance: "slow-fade",
    veil: { amount: DEFAULT_CARD_FADE / 100, tint: veilColour },
  };
  return { card, pictureUrl: picture.thumbnailUrl };
}
