import { UnreadableMusicError, type MusicProbe } from "../../../import/music-probe";
import type { PictureBlobs, StoredSlideshow } from "../../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import type { ImmichPhoto } from "../../../immich/immich-client";
import type { PictureFocus } from "../../../library/picture-focus";
import { ImportSession, type ImportChoices, type ImportSessionPorts } from "../import-session";

export const CREATED_AT = new Date("2026-10-08T12:00:00Z");
export const MUSIC_MS = 60_000;
export const FACE: PictureFocus = {
  kind: "subject",
  box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 },
};

export const pictureFile = (name: string, capturedAt: string): File =>
  Object.assign(new File([name], name, { type: "image/jpeg" }), { capturedAt });

export function sessionWith(
  store = new MemoryLibraryStore(),
  overrides: Partial<ImportSessionPorts> = {},
) {
  let nextId = 0;
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  const onServer: { slideshow: StoredSlideshow; musicAudio: Blob | null }[] = [];
  const ports: ImportSessionPorts = {
    store,
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([`display ${file.name}`]),
        thumbnail: new Blob([`thumbnail ${file.name}`]),
      }),
    captureDate: (file) => Promise.resolve((file as File & { capturedAt: string }).capturedAt),
    immichSource: (photo: ImmichPhoto) => ({
      fileName: photo.fileName,
      mimeType: "image/jpeg",
      identify: () =>
        Promise.resolve({
          fileName: photo.fileName,
          capturedAt: photo.takenAt,
          immichAssetId: photo.id,
        }),
      read: () =>
        Promise.resolve({
          decoded: {
            width: 400,
            height: 300,
            display: new Blob([`display ${photo.id}`]),
            thumbnail: new Blob([`thumbnail ${photo.id}`]),
          },
          focus: FACE,
        }),
    }),
    probeMusic: (file): Promise<MusicProbe> =>
      file.name.endsWith(".broken")
        ? Promise.reject(new UnreadableMusicError(file.name))
        : Promise.resolve({ durationMs: MUSIC_MS }),
    newId: () => `id-${(nextId += 1)}`,
    now: () => CREATED_AT,
    onError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    createOnServer: (slideshow, musicAudio) => {
      onServer.push({ slideshow, musicAudio });
      return Promise.resolve(slideshow);
    },
    ...overrides,
  };
  return { session: new ImportSession(ports), store, errors, logged, onServer };
}

export async function withTwoPictures() {
  const setup = sessionWith();
  setup.session.addPictures([
    pictureFile("late.jpg", "2025-08-02T10:00:00Z"),
    pictureFile("early.jpg", "2025-07-01T10:00:00Z"),
  ]);
  await setup.session.pictures.settled();
  return setup;
}

export function choicesOf(session: ImportSession): ImportChoices {
  return session.choices.current();
}

/** Logs the calls that order media writes against the claims of the import in progress. */
export class LoggingStore extends MemoryLibraryStore {
  readonly log: string[] = [];
  override claimMedia(importId: string, startedAt: Date, mediaId: string): Promise<void> {
    this.log.push(`claim ${mediaId}`);
    return super.claimMedia(importId, startedAt, mediaId);
  }
  override putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    this.log.push(`picture ${id}`);
    return super.putPicture(id, blobs);
  }
  override putMusic(id: string, blob: Blob): Promise<void> {
    this.log.push(`music ${id}`);
    return super.putMusic(id, blob);
  }
  override saveSlideshow(slideshow: StoredSlideshow): Promise<void> {
    this.log.push("slideshow");
    return super.saveSlideshow(slideshow);
  }
  override releaseClaim(importId: string): Promise<void> {
    this.log.push(`end ${importId}`);
    return super.releaseClaim(importId);
  }
}

export const immichPhoto = (id: string, takenAt: string): ImmichPhoto => ({
  id,
  fileName: `${id}.jpg`,
  takenAt,
  size: { width: 4000, height: 3000 },
});
