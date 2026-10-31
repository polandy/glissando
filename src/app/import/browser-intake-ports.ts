import { decodePicture } from "../../import/downscale";
import { captureDate } from "../../import/exif-capture-date";
import { captureGps, type ExifGps } from "../../import/exif-gps";
import { immichPictureSource, type ImmichPictureReaders } from "../../import/immich-picture-source";
import { openClipInVideoElement, videoCaptureDate } from "../../import/browser/video-clip";
import { samplePictureColourPixels } from "../../import/sample-picture-colours";
import type { ImmichPhoto } from "../../immich/immich-client";
import { HttpImmichClient } from "../../immich/http-immich-client";
import { pictureColours } from "../../library/picture-colours";
import { createPlaceDataLoader } from "../../places/place-data-loader";
import { nearestPlace, type Place } from "../../places/nearest-place";
import { WorkerPictureChecker, startCheckWorker } from "../../culling/worker-picture-checker";
import type { Toaster } from "../toast/toaster";
import type { TranslatorState } from "../i18n/translator-state.svelte";
import type { PictureIntakePorts } from "./picture-intake";
import { pickName } from "./picture-queue";

/** The bundled place list (ADR-0043), relative so it resolves under any base path or `file://`. */
const PLACE_DATA_URL = "./places/cities15000.tsv";

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
  // A fresh, independently memoised loader per call, never a module-level singleton.
  const placeData = createPlaceDataLoader(() =>
    fetch(PLACE_DATA_URL).then((response) => response.text()),
  );
  const resolvePlace = async (gps: ExifGps): Promise<Place | null> => {
    try {
      return nearestPlace(await placeData.load(), gps.latitude, gps.longitude);
    } catch (error) {
      log(error);
      return null;
    }
  };
  return {
    decode: decodePicture,
    captureDate,
    gps: captureGps,
    resolvePlace,
    videoClips: {
      openClip: (file) => openClipInVideoElement(file, log),
      captureDate: (file) => videoCaptureDate(file, log),
    },
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
    stoppedPickText: (pick) => {
      const name = pickName(pick, translator.current.t);
      return pick.stored > 0
        ? translator.current.t("import.pickStoppedKept", { name, count: pick.stored })
        : translator.current.t("import.pickStopped", { name });
    },
  };
}
