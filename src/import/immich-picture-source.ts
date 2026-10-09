import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichPhoto,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { focusFromFaces } from "../immich/immich-focus";
import type { PictureFocus } from "../library/picture-focus";
import type { DecodedPicture } from "./downscale";
import { PictureNotDownloadedError, type PictureSource } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";

/** Immich lists photos only, so every photo is a picture whatever its format. */
const IMMICH_PHOTO_TYPE = "image/*";

/** The thumbnail size Immich renders as JPEG at up to 1440 px, decodable by every browser. */
const FALLBACK_SIZE = "preview";

export interface ImmichPictureReaders {
  readonly client: Pick<ImmichClient, "original" | "thumbnail" | "faces">;
  /** Rejects with `UnreadablePictureError` for a file it cannot decode. */
  decode(file: File): Promise<DecodedPicture>;
  /** Tells the app why Immich cannot be used, e.g. a key Immich rejects (`ImmichAvailability`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
  /** Logs an error the import handles in its own way. */
  log(error: unknown): void;
}

/**
 * A photo on Immich, downloaded and decoded like a local file; one the browser cannot decode
 * (e.g. HEIC) falls back to Immich's preview. Its faces give its focus (ADR-0013); without them
 * the on-device pass looks for it later.
 */
export function immichPictureSource(
  photo: ImmichPhoto,
  { client, decode, reportUnavailable, log }: ImmichPictureReaders,
): PictureSource {
  const decodeBlob = (blob: Blob): Promise<DecodedPicture> =>
    decode(new File([blob], photo.fileName, { type: blob.type }));

  const decodeOriginalOrPreview = async (): Promise<DecodedPicture> => {
    try {
      return await decodeBlob(await client.original(photo.id));
    } catch (error) {
      if (!(error instanceof UnreadablePictureError)) {
        throw error;
      }
    }
    return decodeBlob(await client.thumbnail(photo.id, FALLBACK_SIZE));
  };

  const download = async (): Promise<DecodedPicture> => {
    try {
      return await decodeOriginalOrPreview();
    } catch (error) {
      if (error instanceof ImmichUnavailableError) reportUnavailable(error.kind);
      if (error instanceof ImmichUnavailableError || error instanceof ImmichRequestFailedError) {
        throw new PictureNotDownloadedError(photo.fileName, { cause: error });
      }
      throw error;
    }
  };

  const focus = async (): Promise<PictureFocus | null> => {
    try {
      return focusFromFaces(await client.faces(photo.id));
    } catch (error) {
      if (error instanceof ImmichUnavailableError) reportUnavailable(error.kind);
      log(error);
      return null;
    }
  };

  return {
    fileName: photo.fileName,
    mimeType: IMMICH_PHOTO_TYPE,
    read: async () => {
      const decoded = await download();
      return { decoded, capturedAt: photo.takenAt, focus: await focus() };
    },
  };
}
