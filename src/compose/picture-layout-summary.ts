import { FILL_SCREEN_PORTRAIT_PICTURES, type PortraitPictures } from "../library/portrait-pictures";
import type { StoredPicture } from "../library/stored-slideshow";
// Leaf imports, not the player's barrel: that one also reaches the browser player and its
// worker, which a bundle built around `compose` (e.g. the share page) must not pull in.
import type { KenBurnsAt, Size } from "../player/ken-burns";
import { slideLayout } from "../player/slide-layout";
import type { Framing } from "../player/slideshow";
import { KEN_BURNS_EASING } from "./auto-ken-burns";
import { slideUnits } from "./slide-units";

/**
 * The strip and the picture editor judge a single picture's blurred fill against this screen
 * (ADR-0028); its actual slide is laid out again for the viewport that plays it.
 */
export const LAYOUT_REFERENCE_VIEWPORT: Size = { width: 16, height: 9 };

const STILL_FRAMING: Framing = { zoom: 1, centerX: 0.5, centerY: 0.5 };
/** The badges only need `slideLayout`'s kind, which a still motion decides the same as any other. */
const STILL_MOTION: KenBurnsAt = {
  kenBurns: { from: STILL_FRAMING, to: STILL_FRAMING, easing: KEN_BURNS_EASING },
  progress: 0,
};

export interface PictureLayoutSummary {
  /** The pair partner's number (1-based), or null while the picture shows alone. */
  readonly pairedWithNumber: number | null;
  /** Shown whole over a blurred copy of itself because the reference screen would crop too much. */
  readonly blurredFill: boolean;
  /**
   * For a picture marked alone: the number of the neighbour it pairs with once that mark is
   * cleared; null when it would stay single, or is not marked alone.
   */
  readonly rejoinsWithNumber: number | null;
}

/**
 * How each of `pictures` lays out (ADR-0028), for the strip's badges and the picture editor's
 * layout section: a pair's two pictures name each other, a single one says whether it gets the
 * blurred fill against `LAYOUT_REFERENCE_VIEWPORT`; one marked alone names the neighbour it would
 * pair with again.
 */
export function pictureLayoutSummaries(
  pictures: readonly StoredPicture[],
  portraitPictures: PortraitPictures | undefined,
): readonly PictureLayoutSummary[] {
  const units = slideUnits(pictures, portraitPictures);
  const summaries: PictureLayoutSummary[] = pictures.map(() => ({
    pairedWithNumber: null,
    blurredFill: false,
    rejoinsWithNumber: null,
  }));
  for (const unit of units) {
    const [firstIndex, secondIndex] = unit.pictureIndices;
    if (secondIndex === undefined) {
      const picture = pictures[firstIndex] as StoredPicture;
      summaries[firstIndex] = {
        pairedWithNumber: null,
        blurredFill: blurredFill(picture, portraitPictures),
        rejoinsWithNumber: rejoinsWithNumber(pictures, firstIndex, portraitPictures),
      };
    } else {
      summaries[firstIndex] = {
        pairedWithNumber: secondIndex + 1,
        blurredFill: false,
        rejoinsWithNumber: null,
      };
      summaries[secondIndex] = {
        pairedWithNumber: firstIndex + 1,
        blurredFill: false,
        rejoinsWithNumber: null,
      };
    }
  }
  return summaries;
}

/** Lays the pictures out again without `index`'s alone mark, and names its partner there. */
function rejoinsWithNumber(
  pictures: readonly StoredPicture[],
  index: number,
  portraitPictures: PortraitPictures | undefined,
): number | null {
  const { alone, ...unmarked } = pictures[index] as StoredPicture;
  if (alone !== true) {
    return null;
  }
  const without = pictures.map((picture, at) => (at === index ? unmarked : picture));
  const unit = slideUnits(without, portraitPictures).find((candidate) =>
    (candidate.pictureIndices as readonly number[]).includes(index),
  );
  const partnerIndex = unit?.pictureIndices.find((at) => at !== index);
  return partnerIndex === undefined ? null : partnerIndex + 1;
}

function blurredFill(
  picture: StoredPicture,
  portraitPictures: PortraitPictures | undefined,
): boolean {
  const covers = portraitPictures === FILL_SCREEN_PORTRAIT_PICTURES;
  const layout = slideLayout(
    {
      picture: { width: picture.width, height: picture.height },
      motion: STILL_MOTION,
      ...(covers ? { fit: "cover" as const } : {}),
    },
    LAYOUT_REFERENCE_VIEWPORT,
  );
  return layout.kind === "blurred-fill";
}
