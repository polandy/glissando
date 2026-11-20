import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { focusFromFaces } from "../immich/immich-focus";
import type { DetectionInput } from "../library/focus-pass";
import { MediaNotFoundError } from "../library/library-store";

const HTTP_NOT_FOUND = 404;
/** Immich's display-size JPEG, upright, as the player shows it; downscaled for detection (ADR-0041). */
const PREVIEW_SIZE = "preview";

export interface ServerFocusDetectionOptions {
  readonly immich: Pick<ImmichClient, "faces" | "thumbnail">;
  /** Immich's preview, downscaled to the thumbnail bound (`thumbnailFromImage`). */
  downscaleToThumbnail(preview: Blob): Promise<Blob>;
  /** Tells the app why Immich cannot be used (`ImmichAvailability.report`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
}

/**
 * What the server's focus pass looks at for an asset: Immich's faces as a known focus where it
 * has some, else Immich's preview downscaled to the same bound an import's thumbnail is
 * (ADR-0041); beside either, the preview itself, the picture as the player shows it, to measure
 * its sharpness on (ADR-0061). A 404 from Immich is a `MediaNotFoundError`, so the pass skips the
 * picture without fuss.
 */
export function serverDetectionInput(
  options: ServerFocusDetectionOptions,
): (assetId: string) => Promise<DetectionInput> {
  const { immich, downscaleToThumbnail, reportUnavailable } = options;
  return async (assetId: string): Promise<DetectionInput> => {
    const faces = await fromImmich(assetId, reportUnavailable, () => immich.faces(assetId));
    const byFaces = focusFromFaces(faces);
    const preview = await fromImmich(assetId, reportUnavailable, () =>
      immich.thumbnail(assetId, PREVIEW_SIZE),
    );
    if (byFaces !== null) return { kind: "known", focus: byFaces, display: preview };
    return { kind: "detect", thumbnail: await downscaleToThumbnail(preview), display: preview };
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
