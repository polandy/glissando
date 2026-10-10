import type {
  ImmichAlbum,
  ImmichClient,
  ImmichFace,
  ImmichPhoto,
  ImmichPhotoPage,
  ImmichStatus,
} from "../immich-client";

type PhotoQuery = Parameters<ImmichClient["photos"]>[0];
type PhotoAnswer = ImmichPhotoPage | Error;

/** A photo whose day and id are all a test cares about. */
export function photo(id: string, takenAt = "2025-07-12T14:30:00.000Z"): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt, size: { width: 4000, height: 3000 } };
}

/**
 * `ImmichClient` answering from queues a test fills: each call takes the next answer, an `Error`
 * answer rejects, and a held answer resolves only when the test says so.
 */
export class FakeImmichClient implements ImmichClient {
  readonly statusAnswers: ImmichStatus[] = [];
  readonly photoAnswers: PhotoAnswer[] = [];
  readonly photoQueries: PhotoQuery[] = [];
  albumList: readonly ImmichAlbum[] = [];
  /** Rejects every `albums()` while set. */
  albumsError: Error | null = null;
  albumsCalls = 0;
  statusCalls = 0;
  #heldStatus: Promise<ImmichStatus> | null = null;
  #heldPhotos: Promise<PhotoAnswer> | null = null;

  /** The next `status()` waits for the returned function's answer. */
  holdStatus(): (status: ImmichStatus) => void {
    const { promise, resolve } = Promise.withResolvers<ImmichStatus>();
    this.#heldStatus = promise;
    return resolve;
  }

  /** The next `photos()` waits for the returned function's answer. */
  holdPhotos(): (answer: PhotoAnswer) => void {
    const { promise, resolve } = Promise.withResolvers<PhotoAnswer>();
    this.#heldPhotos = promise;
    return resolve;
  }

  async status(): Promise<ImmichStatus> {
    this.statusCalls += 1;
    const held = this.#heldStatus;
    this.#heldStatus = null;
    return held ?? next(this.statusAnswers, "status()");
  }

  albums(): Promise<readonly ImmichAlbum[]> {
    this.albumsCalls += 1;
    return this.albumsError === null
      ? Promise.resolve(this.albumList)
      : Promise.reject(this.albumsError);
  }

  async photos(query: PhotoQuery): Promise<ImmichPhotoPage> {
    this.photoQueries.push(query);
    const held = this.#heldPhotos;
    this.#heldPhotos = null;
    const answer = held === null ? next(this.photoAnswers, "photos()") : await held;
    if (answer instanceof Error) throw answer;
    return answer;
  }

  thumbnailUrl(photoId: string): string {
    return `https://glissando.example/immich/api/assets/${photoId}/thumbnail?size=thumbnail`;
  }

  thumbnail(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }

  original(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }

  faces(): Promise<readonly ImmichFace[]> {
    return Promise.resolve([]);
  }
}

function next<T>(answers: T[], call: string): T {
  const answer = answers.shift();
  if (answer === undefined)
    throw new Error(`the fake Immich client has no answer left for ${call}`);
  return answer;
}
