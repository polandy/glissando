import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichPhoto,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { focusFromFaces } from "../immich/immich-focus";
import type { PictureFocus } from "../library/picture-focus";
import type { PictureIdentity } from "../library/picture-identity";
import type { DecodedPicture } from "./downscale";
import type { ExifGps } from "./exif-gps";
import { PictureNotDownloadedError, type PictureSource } from "./picture-source";
import { UnreadablePictureError } from "./unreadable-picture";
import { VideoRefusedError } from "./video-refusal";
import { readVideoFile, type VideoReaders } from "./video-read";

/** Immich lists photos, so every one is a picture whatever its format. */
const IMMICH_PHOTO_TYPE = "image/*";
const IMMICH_VIDEO_TYPE = "video/*";

/** The thumbnail size Immich renders as JPEG at up to 1440 px, decodable by every browser. */
const FALLBACK_SIZE = "preview";

/** What reading a video needs beyond a photo's; only a device import brings it. */
export interface ImmichVideoReaders extends Pick<VideoReaders, "openClip"> {
  readonly client: Pick<ImmichClient, "video">;
}

export interface ImmichPictureReaders {
  readonly client: Pick<ImmichClient, "original" | "thumbnail" | "faces" | "gps">;
  readonly videos?: ImmichVideoReaders;
  /** Rejects with `UnreadablePictureError` for a file it cannot decode. */
  decode(file: File): Promise<DecodedPicture>;
  /** Tells the app why Immich cannot be used, e.g. a key Immich rejects (`ImmichAvailability`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
  /** Logs an error the import handles in its own way. */
  log(error: unknown): void;
}

/**
 * A photo's original decoded like a local file; Immich's preview where the browser cannot decode
 * the original (e.g. HEIC). Rejects with the client's errors.
 */
export async function decodeImmichPhoto(
  photo: Pick<ImmichPhoto, "id" | "fileName">,
  {
    client,
    decode,
  }: {
    readonly client: Pick<ImmichClient, "original" | "thumbnail">;
    decode: ImmichPictureReaders["decode"];
  },
  signal?: AbortSignal,
): Promise<DecodedPicture> {
  const decodeBlob = (blob: Blob): Promise<DecodedPicture> =>
    decode(new File([blob], photo.fileName, { type: blob.type }));
  try {
    return await decodeBlob(await client.original(photo.id, signal));
  } catch (error) {
    if (!(error instanceof UnreadablePictureError)) {
      throw error;
    }
  }
  return decodeBlob(await client.thumbnail(photo.id, FALLBACK_SIZE, signal));
}

/** What tells the photo from other pictures (ADR-0016), known without downloading it. */
export function immichPhotoIdentity(photo: ImmichPhoto): PictureIdentity {
  return { fileName: photo.fileName, capturedAt: photo.takenAt, immichAssetId: photo.id };
}

/**
 * A video on Immich: its playable version downloaded whole, then read like a local video file. A
 * download that fails is a `PictureNotDownloadedError`.
 */
function immichVideoSource(video: ImmichPhoto, readers: ImmichPictureReaders): PictureSource {
  const { reportUnavailable, videos } = readers;
  return {
    fileName: video.fileName,
    mimeType: IMMICH_VIDEO_TYPE,
    identify: () => Promise.resolve(immichPhotoIdentity(video)),
    read: async () => {
      if (videos === undefined) throw new VideoRefusedError(video.fileName, "videoUnplayable");
      let blob: Blob;
      try {
        blob = await videos.client.video(video.id);
      } catch (error) {
        if (error instanceof ImmichUnavailableError) reportUnavailable(error.kind);
        if (error instanceof ImmichUnavailableError || error instanceof ImmichRequestFailedError) {
          throw new PictureNotDownloadedError(video.fileName, { cause: error });
        }
        throw error;
      }
      return readVideoFile(new File([blob], video.fileName, { type: blob.type }), {
        openClip: videos.openClip,
        decode: readers.decode,
      });
    },
  };
}

/**
 * A photo on Immich, downloaded and decoded like a local file; one the browser cannot decode
 * (e.g. HEIC) falls back to Immich's preview. Its faces give its focus (ADR-0013); without them
 * the on-device pass looks for it later.
 */
export function immichPictureSource(
  photo: ImmichPhoto,
  readers: ImmichPictureReaders,
): PictureSource {
  if (photo.video !== undefined) return immichVideoSource(photo, readers);
  const { client, decode, reportUnavailable, log } = readers;
  const download = async (): Promise<DecodedPicture> => {
    try {
      return await decodeImmichPhoto(photo, { client, decode });
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

  const gps = async (): Promise<ExifGps | null> => {
    try {
      return await client.gps(photo.id);
    } catch (error) {
      if (error instanceof ImmichUnavailableError) reportUnavailable(error.kind);
      log(error);
      return null;
    }
  };

  return {
    fileName: photo.fileName,
    mimeType: IMMICH_PHOTO_TYPE,
    identify: () => Promise.resolve(immichPhotoIdentity(photo)),
    read: async () => {
      const decoded = await download();
      const [pictureFocus, pictureGps] = await Promise.all([focus(), gps()]);
      return { decoded, focus: pictureFocus, ...(pictureGps === null ? {} : { gps: pictureGps }) };
    },
  };
}
