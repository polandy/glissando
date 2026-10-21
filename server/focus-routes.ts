import { DocumentFormatError } from "../src/glissando-file/document-values";
import type { StoredFocus } from "../src/library/picture-focus";
import { readStoredFocus } from "../src/library/read-stored-focus";
import type { LibraryHandlerDependencies } from "./library-handler";
import {
  errorResponse,
  HTTP_STATUS,
  jsonResponse,
  MAX_FOCUS_BYTES,
  notFound,
  readJsonBody,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";

/** The routes under `/api/library/slideshows/{id}/focus` (ADR-0041). */
export function focusRoutes({ repository, now }: LibraryHandlerDependencies) {
  return {
    readAll(slideshowId: string): LibraryResponse {
      const record = repository.findSlideshow(slideshowId);
      if (record === undefined) {
        return notFound();
      }
      const assetIds = record.document.slideshow.pictures.map((picture) => picture.immichAssetId);
      const stored = repository.findPictureFocus(assetIds);
      const focus: Record<string, StoredFocus> = {};
      for (const [assetId, value] of stored) {
        focus[assetId] = value;
      }
      return jsonResponse(HTTP_STATUS.ok, { focus });
    },

    put(slideshowId: string, assetId: string, request: LibraryRequest): LibraryResponse {
      const read = readJsonBody(
        request,
        `a picture's focus is at most ${MAX_FOCUS_BYTES} bytes`,
        "invalidFocus",
      );
      if (read.kind === "refused") {
        return read.response;
      }
      let stored: StoredFocus;
      try {
        stored = readStoredFocus(read.value, "focus");
      } catch (error) {
        if (error instanceof DocumentFormatError) {
          return errorResponse(HTTP_STATUS.badRequest, "invalidFocus", error.message);
        }
        throw error;
      }
      return repository.inTransaction(() => {
        const record = repository.findSlideshow(slideshowId);
        if (record === undefined) {
          return notFound();
        }
        const holds = record.document.slideshow.pictures.some(
          (picture) => picture.immichAssetId === assetId,
        );
        if (!holds) {
          return notFound();
        }
        const outcome = repository.putPictureFocus(assetId, stored, now());
        if (outcome === "newerKept") {
          return errorResponse(
            HTTP_STATUS.conflict,
            "newerFocus",
            `asset ${assetId} already has a focus from a detector at least as new`,
          );
        }
        return { status: HTTP_STATUS.noContent, headers: {}, body: "" };
      });
    },
  };
}
