import type { ImmichClient, ImmichUnavailableKind } from "../immich/immich-client";
import { ImmichUnavailableError } from "../immich/immich-client";
import { thumbnailFromImage } from "../import/downscale";
import { FocusPass, type FocusPassPorts } from "../library/focus-pass";
import type { FocusDetector } from "../library/focus-detector";
import { ServerLibraryUnavailableError } from "../server-library/server-library-client";
import { serverDetectionInput } from "../server-library/server-focus-detection";
import type { ServerLibrary } from "../server-library/server-library";
import type { Navigator } from "./navigation/navigator";
import { followServerFocusStart } from "./server-focus-start";

export interface ServerFocusPassOptions {
  readonly serverLibrary: ServerLibrary;
  /** The device pass's worker, shared through `serializeFocusDetector` (ADR-0041). */
  readonly detector: FocusDetector;
  readonly navigator: Navigator;
  readonly immich: Pick<ImmichClient, "faces" | "thumbnail">;
  reportUnavailable(kind: ImmichUnavailableKind): void;
  log(error: unknown): void;
  reportError(error: unknown): void;
}

export interface ServerFocusPassResult {
  readonly serverFocusPass: FocusPass;
  /**
   * `options.serverLibrary`, its `createSlideshow` and `saveOnServer` also starting the pass at
   * once on success, instead of waiting for the next availability change.
   */
  readonly serverLibrary: ServerLibrary;
}

/**
 * The server's own background focus pass (ADR-0041, `dev-docs/server_library/FOCUS.md`): starts
 * as `followServerFocusStart` says, and again right after a slideshow is created or saved on the
 * server; never on the frame route, a kiosk showing one album having no library to search.
 */
export function startServerFocusPass(options: ServerFocusPassOptions): ServerFocusPassResult {
  const { serverLibrary, detector, navigator, immich, reportUnavailable, log, reportError } =
    options;
  const store: FocusPassPorts["store"] = {
    listSlideshows: () => serverLibrary.store.listSlideshows(),
    pictureFocus: (pictureIds) => serverLibrary.store.pictureFocusForPass(pictureIds),
    thumbnailBlob: (id) => serverLibrary.store.thumbnailBlob(id),
    putPictureFocus: (id, focus) => serverLibrary.store.putPictureFocus(id, focus),
    detectionInput: serverDetectionInput({
      immich,
      downscaleToThumbnail: thumbnailFromImage,
      reportUnavailable,
    }),
  };
  const serverFocusPass = new FocusPass({
    store,
    detector,
    log,
    reportError,
    pausesOn: (error) =>
      error instanceof ServerLibraryUnavailableError || error instanceof ImmichUnavailableError,
  });

  const startIfAllowed = (): void => {
    if (navigator.route.screen !== "frame") serverFocusPass.start();
  };
  followServerFocusStart({
    availability: serverLibrary.availability,
    navigator,
    start: () => serverFocusPass.start(),
  });

  return {
    serverFocusPass,
    serverLibrary: {
      ...serverLibrary,
      createSlideshow: async (slideshow, songsAudio) => {
        const created = await serverLibrary.createSlideshow(slideshow, songsAudio);
        startIfAllowed();
        return created;
      },
      saveOnServer: async (deviceSlideshow) => {
        const saved = await serverLibrary.saveOnServer(deviceSlideshow);
        startIfAllowed();
        return saved;
      },
    },
  };
}
