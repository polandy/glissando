import { DocumentFormatError } from "../src/glissando-file/document-values";
import { readServerDocument, type ServerDocument } from "../src/server-library/server-document";
import type { LibraryHandlerDependencies } from "./library-handler";
import type { SlideshowRecord } from "./library-repository";
import {
  errorResponse,
  HTTP_STATUS,
  isJsonContentType,
  jsonResponse,
  MAX_DOCUMENT_BYTES,
  notFound,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";

const FIRST_REVISION = 1;
const IF_MATCH = "if-match";
const CONTENT_TYPE = "content-type";

/** A revision's entity tag, as `ETag` answers it and `If-Match` names it. */
const entityTag = (revision: number): string => `"${revision}"`;

const asVersion = ({ id, revision, document }: SlideshowRecord) => ({ id, revision, document });

/** The routes under `/api/library/slideshows`. */
export function slideshowRoutes({ repository, now, newId }: LibraryHandlerDependencies) {
  const musicMissing = (document: ServerDocument): LibraryResponse | undefined => {
    const musicId = document.slideshow.music?.musicId;
    return musicId === undefined || repository.findMusic(musicId) !== undefined
      ? undefined
      : errorResponse(
          HTTP_STATUS.conflict,
          "musicMissing",
          `slideshow.music.musicId ${JSON.stringify(musicId)} is no music on this server; upload it first`,
        );
  };

  /** Deletes the music `before` named if no slideshow names it any more. */
  const dropUnreferencedMusic = (before: ServerDocument, after?: ServerDocument): void => {
    const musicId = before.slideshow.music?.musicId;
    if (
      musicId !== undefined &&
      musicId !== after?.slideshow.music?.musicId &&
      !repository.isMusicReferenced(musicId)
    ) {
      repository.deleteMusic(musicId);
    }
  };

  return {
    list: (): LibraryResponse =>
      jsonResponse(HTTP_STATUS.ok, { slideshows: repository.listSlideshows().map(asVersion) }),

    read(id: string): LibraryResponse {
      const record = repository.findSlideshow(id);
      return record === undefined
        ? notFound()
        : jsonResponse(HTTP_STATUS.ok, asVersion(record), { etag: entityTag(record.revision) });
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
        dropUnreferencedMusic(current.document, document);
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
        dropUnreferencedMusic(current.document);
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
  if (request.body.kind === "tooLarge") {
    return refused(
      errorResponse(
        HTTP_STATUS.tooLarge,
        "tooLarge",
        `a slideshow document is at most ${MAX_DOCUMENT_BYTES} bytes`,
      ),
    );
  }
  const contentType = request.headers[CONTENT_TYPE];
  if (!isJsonContentType(contentType)) {
    return refused(
      errorResponse(
        HTTP_STATUS.unsupportedMediaType,
        "notJson",
        `Content-Type ${JSON.stringify(contentType ?? null)} is no application/json`,
      ),
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(request.body.bytes));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return refused(
        errorResponse(HTTP_STATUS.badRequest, "invalidDocument", `no JSON: ${error.message}`),
      );
    }
    throw error;
  }
  try {
    return { kind: "document", document: readServerDocument(json) };
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return refused(errorResponse(HTTP_STATUS.badRequest, "invalidDocument", error.message));
    }
    throw error;
  }
}
