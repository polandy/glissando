import type { ImmichPhoto } from "../../immich/immich-client";
import type { PictureSource } from "../../import/picture-source";
import type { PictureColours } from "../../library/picture-colours";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import type { PictureIntakePorts } from "../import/picture-intake";
import { Toaster } from "../toast/toaster";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";

/** A picture with no detected colour, for ports a test does not care about colours. */
export const NO_COLOURS: PictureColours = { veil: "#404040", accent: "#C0C0C0" };

export const INTAKE_NOW = new Date("2026-10-08T12:00:00Z");

/** A generated picture file whose capture date the fake reader returns. */
export const pictureFile = (name: string, capturedAt: string): File =>
  Object.assign(new File([name], name, { type: "image/jpeg" }), { capturedAt });

/** A generated video file the fake clip reader opens as an 8 s clip; `refused` names it unplayable. */
export const FAKE_CLIP_MS = 8000;
export const videoFile = (name: string, capturedAt: string): File =>
  Object.assign(new File([name], name, { type: "video/mp4" }), { capturedAt });

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

/** The stop toast's text, in the same shape as `import.pickStopped`/`pickStoppedKept`. */
export function fakeStoppedPickText(pick: {
  readonly kind: string;
  readonly folderName?: string;
  readonly total: number;
  readonly stored: number;
}): string {
  const name =
    pick.kind === "folder"
      ? (pick.folderName ?? "")
      : pick.kind === "immich"
        ? `Immich · ${pick.total} photos`
        : `${pick.total} pictures`;
  return pick.stored > 0
    ? `Stopped ${name} · ${pick.stored} pictures already in stay`
    : `Stopped ${name}`;
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
    gps: () => Promise.resolve(null),
    resolvePlace: () => Promise.resolve(null),
    videoClips: {
      captureDate: (file) => Promise.resolve((file as File & { capturedAt: string }).capturedAt),
      openClip: (file) =>
        Promise.resolve(
          file.name.startsWith("broken")
            ? null
            : {
                durationMs: FAKE_CLIP_MS,
                posterFrame: (atMs) =>
                  Promise.resolve(new File([`frame ${atMs}`], `${file.name}.jpg`)),
                close: () => undefined,
              },
        ),
    },
    immichSource: fakeImmichSource,
    pixels: () => Promise.resolve([]),
    immichColours: () => Promise.resolve(NO_COLOURS),
    checker: new FakePictureChecker(),
    newId: () => `id-${(nextId += 1)}`,
    now: () => INTAKE_NOW,
    onError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    stoppedPickText: fakeStoppedPickText,
    ...overrides,
  };
  return { ports, store, errors, logged, toaster: removal.toaster };
}
