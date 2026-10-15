import { decodePicture } from "../../import/downscale";
import { captureDate } from "../../import/exif-capture-date";
import { immichPictureSource, type ImmichPictureReaders } from "../../import/immich-picture-source";
import { samplePictureColourPixels } from "../../import/sample-picture-colours";
import type { ImmichPhoto } from "../../immich/immich-client";
import { HttpImmichClient } from "../../immich/http-immich-client";
import { pictureColours } from "../../library/picture-colours";
import { WorkerPictureChecker, startCheckWorker } from "../../culling/worker-picture-checker";
import type { Toaster } from "../toast/toaster";
import type { TranslatorState } from "../i18n/translator-state.svelte";
import type { PictureIntakePorts } from "./picture-intake";

export interface BrowserIntakePortsDependencies {
  readonly immichClient: HttpImmichClient;
  readonly immichReaders: ImmichPictureReaders;
  readonly newId: () => string;
  readonly now: () => Date;
  readonly onError: (error: unknown) => void;
  readonly log: (error: unknown) => void;
  readonly toaster: Toaster;
  readonly translator: TranslatorState;
}

/**
 * What every picture intake reads with, for a new slideshow and for adding to one: files
 * downscaled and sampled for colours (ADR-0033), Immich photos the same way, or linked by their
 * colours alone once a slideshow lives on the server. `store` is each session's own, so it is
 * added where this is used, not here.
 */
export function browserIntakePorts(
  deps: BrowserIntakePortsDependencies,
): Omit<PictureIntakePorts, "store"> {
  const { immichClient, immichReaders, newId, now, onError, log, toaster, translator } = deps;
  return {
    decode: decodePicture,
    captureDate,
    immichSource: (photo: ImmichPhoto) => immichPictureSource(photo, immichReaders),
    pixels: samplePictureColourPixels,
    immichColours: (photo: ImmichPhoto) =>
      immichClient
        .thumbnail(photo.id, "thumbnail")
        .then(samplePictureColourPixels)
        .then(pictureColours),
    checker: new WorkerPictureChecker(startCheckWorker),
    newId,
    now,
    onError,
    log,
    toaster,
    removedText: (count: number) => translator.current.t("slideshow.removed", { count }),
    undoLabel: () => translator.current.t("slideshow.undo"),
  };
}
