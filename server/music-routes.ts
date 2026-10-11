import { parseMusicBeats } from "../src/beats/music-beats-json";
import type { LibraryHandlerDependencies } from "./library-handler";
import {
  errorResponse,
  HTTP_STATUS,
  jsonResponse,
  MAX_DOCUMENT_BYTES,
  MAX_MUSIC_BYTES,
  notFound,
  readJsonBody,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";

/** Music uploaded but named by no slideshow this long is deleted on the next upload. */
const UNREFERENCED_MUSIC_GRACE_MS = 60 * 60 * 1000;

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

    readBeats(id: string): LibraryResponse {
      if (repository.findMusic(id) === undefined) {
        return notFound();
      }
      return jsonResponse(HTTP_STATUS.ok, { beats: repository.findMusicBeats(id) ?? null });
    },

    replaceBeats(id: string, request: LibraryRequest): LibraryResponse {
      const read = readJsonBody(
        request,
        `music beats are at most ${MAX_DOCUMENT_BYTES} bytes`,
        "invalidBeats",
      );
      if (read.kind === "refused") {
        return read.response;
      }
      const beats = parseMusicBeats(read.value);
      if (beats === undefined) {
        return errorResponse(HTTP_STATUS.badRequest, "invalidBeats", "no valid MusicBeats");
      }
      return repository.inTransaction(() => {
        if (repository.findMusic(id) === undefined) {
          return notFound();
        }
        repository.putMusicBeats(id, beats);
        return { status: HTTP_STATUS.noContent, headers: {}, body: "" };
      });
    },
  };
}

function isAudio(contentType: string): boolean {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return AUDIO_MEDIA_TYPE.test(mediaType);
}
