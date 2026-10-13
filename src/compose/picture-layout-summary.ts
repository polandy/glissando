import { FILL_SCREEN_PORTRAIT_PICTURES, type PortraitPictures } from "../library/portrait-pictures";
import type { StoredPicture } from "../library/stored-slideshow";
import { slideLayout, type Framing, type KenBurnsAt, type Size } from "../player";
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
}

/**
 * How each of `pictures` lays out (ADR-0028), for the strip's badges and the picture editor's
 * layout section: a pair's two pictures name each other, a single one says whether it gets the
 * blurred fill against `LAYOUT_REFERENCE_VIEWPORT`.
 */
export function pictureLayoutSummaries(
  pictures: readonly StoredPicture[],
  portraitPictures: PortraitPictures | undefined,
): readonly PictureLayoutSummary[] {
  const units = slideUnits(pictures, portraitPictures);
  const summaries: PictureLayoutSummary[] = pictures.map(() => ({
    pairedWithNumber: null,
    blurredFill: false,
  }));
  for (const unit of units) {
    const [firstIndex, secondIndex] = unit.pictureIndices;
    if (secondIndex === undefined) {
      const picture = pictures[firstIndex] as StoredPicture;
      summaries[firstIndex] = {
        pairedWithNumber: null,
        blurredFill: blurredFill(picture, portraitPictures),
      };
    } else {
      summaries[firstIndex] = { pairedWithNumber: secondIndex + 1, blurredFill: false };
      summaries[secondIndex] = { pairedWithNumber: firstIndex + 1, blurredFill: false };
    }
  }
  return summaries;
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
