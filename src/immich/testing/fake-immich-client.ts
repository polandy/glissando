import type {
  ImmichAlbum,
  ImmichClient,
  ImmichFace,
  ImmichPerson,
  ImmichPhoto,
  ImmichPhotoPage,
  ImmichStatus,
  TimelineMonth,
} from "../immich-client";

type PhotoQuery = Parameters<ImmichClient["photos"]>[0];
/** A page; a test names `hiddenTakenAt` only where it matters. */
type PhotoAnswer =
  (Omit<ImmichPhotoPage, "hiddenTakenAt"> & { hiddenTakenAt?: readonly string[] }) | Error;

/** A photo whose day and id are all a test cares about. */
export function photo(
  id: string,
  takenAt = "2025-07-12T14:30:00Z",
  place: string | null = null,
): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt, size: { width: 4000, height: 3000 }, place };
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
  months: readonly TimelineMonth[] = [];
  peopleList: readonly ImmichPerson[] = [];
  paths: readonly string[] = [];
  /** Rejects every `albums()` while set. */
  albumsError: Error | null = null;
  /** Reject `timelineMonths()`, `people()` and `folderPaths()` while set. */
  monthsError: Error | null = null;
  peopleError: Error | null = null;
  foldersError: Error | null = null;
  albumsCalls = 0;
  monthsCalls = 0;
  peopleCalls = 0;
  folderCalls = 0;
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
    return { hiddenTakenAt: [], ...answer };
  }

  timelineMonths(): Promise<readonly TimelineMonth[]> {
    this.monthsCalls += 1;
    return answer(this.months, this.monthsError);
  }

  people(): Promise<readonly ImmichPerson[]> {
    this.peopleCalls += 1;
    return answer(this.peopleList, this.peopleError);
  }

  folderPaths(): Promise<readonly string[]> {
    this.folderCalls += 1;
    return answer(this.paths, this.foldersError);
  }

  personThumbnailUrl(personId: string): string {
    return `https://glissando.example/immich/api/people/${personId}/thumbnail`;
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

  video(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }

  faces(): Promise<readonly ImmichFace[]> {
    return Promise.resolve([]);
  }
}

function answer<T>(value: T, error: Error | null): Promise<T> {
  return error === null ? Promise.resolve(value) : Promise.reject(error);
}

function next<T>(answers: T[], call: string): T {
  const answer = answers.shift();
  if (answer === undefined)
    throw new Error(`the fake Immich client has no answer left for ${call}`);
  return answer;
}
