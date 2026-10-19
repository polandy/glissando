import type { LibraryHandlerDependencies } from "./library-handler";
import type { LibraryRepository, ShareLink, SlideshowRecord } from "./library-repository";
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
import { shareDocumentOf } from "./share-document";
import { newShareToken } from "./share-token";
import { musicLoudnessToJson } from "../src/loudness/music-loudness-json";

/** What a recipient's browser may keep: a picture or a song, a day; the document never. */
const MEDIA_CACHE_CONTROL = "private, max-age=86400";
const DOCUMENT_CACHE_CONTROL = "no-store";
const CACHE_CONTROL = "cache-control";
const CONTENT_TYPE = "content-type";
/** The header Caddy copies from the picture check into its request to Immich. */
const IMMICH_ASSET_HEADER = "x-glissando-immich-asset";
/** An Immich asset id, as immich-proxy.caddy allows it; nothing else may land in Immich's path. */
const IMMICH_ASSET_ID = /^[0-9a-fA-F-]{36}$/;
/** A position: a whole number from 0, written without leading zeros. */
const POSITION = /^(0|[1-9][0-9]*)$/;

/** The JSON of a slideshow's share link, as the private API answers it. */
export const shareLinkJson = (link: ShareLink | undefined) =>
  link === undefined
    ? null
    : { token: link.token, createdAt: new Date(link.createdAt).toISOString() };

export const notShared = () =>
  errorResponse(HTTP_STATUS.notFound, "notShared", "no slideshow is shared by this link");

/** The item at `position` of `items`, if `position` names one. */
function at<Item>(items: readonly Item[], position: string): Item | undefined {
  return POSITION.test(position) ? items[Number(position)] : undefined;
}

/** The private routes under `/api/library/slideshows/{id}/share` and the public `/api/share/`. */
export function shareRoutes({ repository, now, randomBytes }: LibraryHandlerDependencies) {
  /** The slideshow shared by `token`, or the 404 every unknown or turned-off token answers. */
  const sharedBy = (token: string, answer: (record: SlideshowRecord) => LibraryResponse) => {
    const record = repository.slideshowByShareToken(token);
    return record === undefined ? notShared() : answer(record);
  };

  return {
    share(id: string, request: LibraryRequest): LibraryResponse {
      if (request.body.kind === "tooLarge") {
        return errorResponse(
          HTTP_STATUS.tooLarge,
          "tooLarge",
          `a share request is at most ${MAX_DOCUMENT_BYTES} bytes`,
        );
      }
      const contentType = request.headers[CONTENT_TYPE];
      if (!isJsonContentType(contentType)) {
        return errorResponse(
          HTTP_STATUS.unsupportedMediaType,
          "notJson",
          `Content-Type ${JSON.stringify(contentType ?? null)} is no application/json`,
        );
      }
      return repository.inTransaction(() => {
        if (repository.findSlideshow(id) === undefined) {
          return notFound();
        }
        const existing = repository.shareOf(id);
        if (existing !== undefined) {
          return jsonResponse(HTTP_STATUS.ok, shareLinkJson(existing));
        }
        const link = { token: newShareToken(randomBytes), createdAt: now() };
        repository.share(id, link);
        return jsonResponse(HTTP_STATUS.created, shareLinkJson(link));
      });
    },

    unshare(id: string): LibraryResponse {
      return repository.inTransaction(() => {
        if (repository.findSlideshow(id) === undefined) {
          return notFound();
        }
        if (repository.shareOf(id) === undefined) {
          return errorResponse(HTTP_STATUS.notFound, "notShared", "the slideshow has no link");
        }
        repository.unshare(id);
        return { status: HTTP_STATUS.noContent, headers: {}, body: "" };
      });
    },

    document: (token: string): LibraryResponse =>
      sharedBy(token, (record) => shareDocumentAnswer(repository, record)),

    song: (token: string, position: string): LibraryResponse =>
      sharedBy(token, (record) => shareSongAnswer(repository, record, position)),

    /** Caddy fetches the named asset's preview from Immich with the key (ADR-0025). */
    pictureCheck: (token: string, position: string): LibraryResponse =>
      sharedBy(token, (record) => sharePictureCheckAnswer(record, position)),
  };
}

/** A shown slideshow's document, as a recipient's page or a TV reads it. */
export function shareDocumentAnswer(
  repository: LibraryRepository,
  { revision, document: { slideshow } }: SlideshowRecord,
): LibraryResponse {
  return jsonResponse(
    HTTP_STATUS.ok,
    {
      revision,
      slideshow: shareDocumentOf(slideshow),
      beats: slideshow.songs.map((song) => repository.findMusicBeats(song.musicId) ?? null),
      loudness: slideshow.songs.map((song) => {
        const loudness = repository.findMusicLoudness(song.musicId);
        return loudness === undefined ? null : musicLoudnessToJson(loudness);
      }),
    },
    { [CACHE_CONTROL]: DOCUMENT_CACHE_CONTROL },
  );
}

/** The bytes of the song at `position` of a shown slideshow. */
export function shareSongAnswer(
  repository: LibraryRepository,
  { document }: SlideshowRecord,
  position: string,
): LibraryResponse {
  const song = at(document.slideshow.songs, position);
  const music = song === undefined ? undefined : repository.findMusic(song.musicId);
  return music === undefined
    ? errorResponse(HTTP_STATUS.notFound, "noSuchSong", "the slideshow has no such song")
    : {
        status: HTTP_STATUS.ok,
        headers: { [CONTENT_TYPE]: music.contentType, [CACHE_CONTROL]: MEDIA_CACHE_CONTROL },
        body: music.bytes,
      };
}

/** The Immich asset of the picture at `position`, as a header Caddy copies (ADR-0025). */
export function sharePictureCheckAnswer(
  { document }: SlideshowRecord,
  position: string,
): LibraryResponse {
  const assetId = at(document.slideshow.pictures, position)?.immichAssetId;
  return assetId === undefined || !IMMICH_ASSET_ID.test(assetId)
    ? errorResponse(HTTP_STATUS.notFound, "noSuchPicture", "the slideshow has no such picture")
    : { status: HTTP_STATUS.ok, headers: { [IMMICH_ASSET_HEADER]: assetId }, body: "" };
}
