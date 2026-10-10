import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";

/**
 * Reports a failed thumbnail load unless the picture is only gone from Immich: the slideshow
 * screen marks that one as missing, so here its thumbnail just stays blank.
 */
export function reportUnlessMissingFromImmich(
  onError: (error: unknown) => void,
): (error: unknown) => void {
  return (error) => {
    if (!(error instanceof PictureMissingFromImmichError)) onError(error);
  };
}
