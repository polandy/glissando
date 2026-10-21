import { DocumentFormatError } from "../src/glissando-file/document-values";
import { readServerDocument, type ServerDocument } from "../src/server-library/server-document";
import type { LibraryHandlerDependencies } from "./library-handler";
import type { SlideshowRecord } from "./library-repository";
import { shareLinkJson } from "./share-routes";
import {
  errorResponse,
  HTTP_STATUS,
  jsonResponse,
  MAX_DOCUMENT_BYTES,
  notFound,
  readJsonBody,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";

const FIRST_REVISION = 1;
const IF_MATCH = "if-match";

/** A revision's entity tag, as `ETag` answers it and `If-Match` names it. */
const entityTag = (revision: number): string => `"${revision}"`;

const asVersion = ({ id, revision, document }: SlideshowRecord) => ({ id, revision, document });

/** The routes under `/api/library/slideshows`. */
export function slideshowRoutes({ repository, now, newId }: LibraryHandlerDependencies) {
  const musicMissing = (document: ServerDocument): LibraryResponse | undefined => {
    const missing = document.slideshow.songs.find(
      (song) => repository.findMusic(song.musicId) === undefined,
    );
    return missing === undefined
      ? undefined
      : errorResponse(
          HTTP_STATUS.conflict,
          "musicMissing",
          `slideshow.songs musicId ${JSON.stringify(missing.musicId)} is no music on this server; upload it first`,
        );
  };

  /**
   * Restarts the grace period of every song's music `before` named that no slideshow names any
   * more: the upload sweep deletes it later, so an undo naming it again still finds it.
   */
  const releaseUnreferencedMusic = (before: ServerDocument, after?: ServerDocument): void => {
    const afterIds = new Set(after?.slideshow.songs.map((song) => song.musicId) ?? []);
    for (const { musicId } of before.slideshow.songs) {
      if (!afterIds.has(musicId) && !repository.isMusicReferenced(musicId)) {
        repository.restartMusicGrace(musicId, now());
      }
    }
  };

  /**
   * Deletes the stored focus of every picture `before` named that no slideshow names any more
   * (ADR-0041): unlike music, a dropped picture's asset id is gone for good, so its focus goes
   * with it, no grace period.
   */
  const releaseUnreferencedPictureFocus = (
    before: ServerDocument,
    after?: ServerDocument,
  ): void => {
    const afterIds = new Set(
      after?.slideshow.pictures.map((picture) => picture.immichAssetId) ?? [],
    );
    for (const { immichAssetId } of before.slideshow.pictures) {
      if (!afterIds.has(immichAssetId) && !repository.isPictureReferenced(immichAssetId)) {
        repository.deletePictureFocus(immichAssetId);
      }
    }
  };

  /** A slideshow as its GETs answer it: the version and its share link (SHARE_LINK.md). */
  const asListed = (record: SlideshowRecord) => ({
    ...asVersion(record),
    share: shareLinkJson(repository.shareOf(record.id)),
  });

  return {
    list: (): LibraryResponse =>
      jsonResponse(HTTP_STATUS.ok, { slideshows: repository.listSlideshows().map(asListed) }),

    read(id: string): LibraryResponse {
      const record = repository.findSlideshow(id);
      return record === undefined
        ? notFound()
        : jsonResponse(HTTP_STATUS.ok, asListed(record), { etag: entityTag(record.revision) });
    },

    create(request: LibraryRequest): LibraryResponse {
      const read = readDocument(request);
      if (read.kind === "refused") {
        return read.response;
      }
      const { document } = read;
      return repository.inTransaction(() => {
        const missing = musicMissing(document);
        if (missing !== undefined) {
          return missing;
        }
        const id = newId();
        repository.insertSlideshow({ id, revision: FIRST_REVISION, createdAt: now(), document });
        return jsonResponse(HTTP_STATUS.created, { id, revision: FIRST_REVISION });
      });
    },

    replace(id: string, request: LibraryRequest): LibraryResponse {
      const ifMatch = request.headers[IF_MATCH];
      if (ifMatch === undefined) {
        return errorResponse(
          HTTP_STATUS.preconditionRequired,
          "revisionRequired",
          `name the revision this edit is based on: If-Match: ${entityTag(FIRST_REVISION)}`,
        );
      }
      const read = readDocument(request);
      if (read.kind === "refused") {
        return read.response;
      }
      const { document } = read;
      return repository.inTransaction(() => {
        const current = repository.findSlideshow(id);
        if (current === undefined) {
          return notFound();
        }
        if (ifMatch !== entityTag(current.revision)) {
          return errorResponse(
            HTTP_STATUS.preconditionFailed,
            "revisionChanged",
            `the slideshow is at revision ${current.revision}, not ${ifMatch}`,
            { current: asVersion(current) },
          );
        }
        const missing = musicMissing(document);
        if (missing !== undefined) {
          return missing;
        }
        const revision = current.revision + 1;
        repository.updateSlideshow(id, revision, document);
        releaseUnreferencedMusic(current.document, document);
        releaseUnreferencedPictureFocus(current.document, document);
        return jsonResponse(HTTP_STATUS.ok, { revision });
      });
    },

    remove(id: string): LibraryResponse {
      return repository.inTransaction(() => {
        const current = repository.findSlideshow(id);
        if (current === undefined) {
          return notFound();
        }
        repository.deleteSlideshow(id);
        releaseUnreferencedMusic(current.document);
        releaseUnreferencedPictureFocus(current.document);
        return { status: HTTP_STATUS.noContent, headers: {}, body: "" };
      });
    },
  };
}

type DocumentReading =
  | { readonly kind: "document"; readonly document: ServerDocument }
  | { readonly kind: "refused"; readonly response: LibraryResponse };

const refused = (response: LibraryResponse): DocumentReading => ({ kind: "refused", response });

/** The request's document, or the response refusing it. */
function readDocument(request: LibraryRequest): DocumentReading {
  const read = readJsonBody(
    request,
    `a slideshow document is at most ${MAX_DOCUMENT_BYTES} bytes`,
    "invalidDocument",
  );
  if (read.kind === "refused") {
    return refused(read.response);
  }
  try {
    return { kind: "document", document: readServerDocument(read.value) };
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return refused(errorResponse(HTTP_STATUS.badRequest, "invalidDocument", error.message));
    }
    throw error;
  }
}
