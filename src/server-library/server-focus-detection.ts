import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { focusFromFaces } from "../immich/immich-focus";
import type { PictureFocus } from "../library/picture-focus";
import { MediaNotFoundError } from "../library/library-store";

const HTTP_NOT_FOUND = 404;
/** Immich's display-size JPEG, upright; downscaled further for detection (ADR-0041). */
const PREVIEW_SIZE = "preview";

export interface ServerFocusDetectionOptions {
  readonly immich: Pick<ImmichClient, "faces" | "thumbnail">;
  /** Immich's preview, downscaled to the thumbnail bound (`thumbnailFromImage`). */
  downscaleToThumbnail(preview: Blob): Promise<Blob>;
  /** Tells the app why Immich cannot be used (`ImmichAvailability.report`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
}

/**
 * What the server's focus pass detects on, for an asset Immich faces did not already give a
 * focus to: Immich's preview, downscaled to the same bound an import's thumbnail is (ADR-0041).
 * A 404 from Immich is a `MediaNotFoundError`, so the pass skips the picture without fuss.
 */
export function serverDetectionInput(
  options: ServerFocusDetectionOptions,
): (assetId: string) => Promise<PictureFocus | Blob> {
  const { immich, downscaleToThumbnail, reportUnavailable } = options;
  return async (assetId: string): Promise<PictureFocus | Blob> => {
    const faces = await fromImmich(assetId, reportUnavailable, () => immich.faces(assetId));
    const byFaces = focusFromFaces(faces);
    if (byFaces !== null) return byFaces;
    const preview = await fromImmich(assetId, reportUnavailable, () =>
      immich.thumbnail(assetId, PREVIEW_SIZE),
    );
    return downscaleToThumbnail(preview);
  };
}

/** Runs an Immich request for `assetId`, a 404 as `MediaNotFoundError`. */
async function fromImmich<T>(
  assetId: string,
  reportUnavailable: (kind: ImmichUnavailableKind) => void,
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ImmichRequestFailedError && error.status === HTTP_NOT_FOUND) {
      throw new MediaNotFoundError(assetId);
    }
    if (error instanceof ImmichUnavailableError) reportUnavailable(error.kind);
    throw error;
  }
}
