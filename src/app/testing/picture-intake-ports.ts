import type { ImmichPhoto } from "../../immich/immich-client";
import type { PictureSource } from "../../import/picture-source";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { PictureIntakePorts } from "../import/picture-intake";
import { Toaster } from "../toast/toaster";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";

export const INTAKE_NOW = new Date("2026-10-08T12:00:00Z");

/** A generated picture file whose capture date the fake reader returns. */
export const pictureFile = (name: string, capturedAt: string): File =>
  Object.assign(new File([name], name, { type: "image/jpeg" }), { capturedAt });

/** A photo from the fake Immich, read like a file. */
export function fakeImmichSource(photo: ImmichPhoto): PictureSource {
  return {
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
        focus: null,
      }),
  };
}

/** The undo toast of removed pictures, on a toaster whose time only moves when told. */
export function fakeRemovalPorts() {
  return {
    toaster: new Toaster(new FakeScheduler()),
    removedText: (count: number) =>
      count === 1 ? "1 picture removed" : `${count} pictures removed`,
    undoLabel: () => "Undo",
  };
}

/** Ports for a picture intake over an in-memory store; ids count up from `id-1`. */
export function fakeIntakePorts(
  store = new MemoryLibraryStore(),
  overrides: Partial<PictureIntakePorts> = {},
) {
  let nextId = 0;
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  const removal = fakeRemovalPorts();
  const ports: PictureIntakePorts = {
    store,
    ...removal,
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([`display ${file.name}`]),
        thumbnail: new Blob([`thumbnail ${file.name}`]),
      }),
    captureDate: (file) => Promise.resolve((file as File & { capturedAt: string }).capturedAt),
    immichSource: fakeImmichSource,
    newId: () => `id-${(nextId += 1)}`,
    now: () => INTAKE_NOW,
    onError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    ...overrides,
  };
  return { ports, store, errors, logged, toaster: removal.toaster };
}
