import type { LibraryHandlerDependencies } from "./library-handler";
import {
  errorResponse,
  HTTP_STATUS,
  jsonResponse,
  MAX_MUSIC_BYTES,
  notFound,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";

/** Music uploaded but named by no slideshow this long is deleted on the next upload. */
export const UNREFERENCED_MUSIC_GRACE_MS = 60 * 60 * 1000;

const CONTENT_TYPE = "content-type";
const AUDIO_MEDIA_TYPE = /^audio\/[^\s;/]+$/;

/** The routes under `/api/library/music`. */
export function musicRoutes({ repository, now, newId }: LibraryHandlerDependencies) {
  return {
    upload(request: LibraryRequest): LibraryResponse {
      if (request.body.kind === "tooLarge") {
        return errorResponse(
          HTTP_STATUS.tooLarge,
          "tooLarge",
          `music is at most ${MAX_MUSIC_BYTES} bytes`,
        );
      }
      const contentType = request.headers[CONTENT_TYPE]?.trim();
      if (contentType === undefined || !isAudio(contentType)) {
        return errorResponse(
          HTTP_STATUS.unsupportedMediaType,
          "notAudio",
          `Content-Type ${JSON.stringify(contentType ?? null)} is no audio/* type`,
        );
      }
      const { bytes } = request.body;
      return repository.inTransaction(() => {
        const uploadedAt = now();
        const graceStart = uploadedAt - UNREFERENCED_MUSIC_GRACE_MS;
        for (const stale of repository.unreferencedMusicUploadedBefore(graceStart)) {
          repository.deleteMusic(stale);
        }
        const musicId = newId();
        repository.insertMusic({ id: musicId, contentType, bytes, uploadedAt });
        return jsonResponse(HTTP_STATUS.created, { musicId });
      });
    },

    read(id: string): LibraryResponse {
      const music = repository.findMusic(id);
      return music === undefined
        ? notFound()
        : {
            status: HTTP_STATUS.ok,
            headers: { [CONTENT_TYPE]: music.contentType },
            body: music.bytes,
          };
    },
  };
}

function isAudio(contentType: string): boolean {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return AUDIO_MEDIA_TYPE.test(mediaType);
}
