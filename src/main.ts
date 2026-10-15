import { mount } from "svelte";
import App from "./app/App.svelte";
import { createErrorReporter } from "./app/errors/error-reporter";
import { translatorContext } from "./app/i18n/context";
import { createTranslator } from "./app/i18n/translator";
import { TranslatorState } from "./app/i18n/translator-state.svelte";
import { AddPicturesSession, serverAddingStore } from "./app/add-pictures/add-pictures-session";
import { ImportSession } from "./app/import/import-session";
import { createWindowHistory, Navigator } from "./app/navigation/navigator";
import { parseFrameDeepLink } from "./app/frame/frame-deep-link";
import { browserClearDeepLinkHash, openDeepLinkedFrame } from "./app/frame/frame-startup-deep-link";
import { randomId } from "./app/random-id";
import { AppSettings } from "./app/settings/app-settings";
import { createStorageLanguagePreferenceStore } from "./app/settings/language";
import {
  createStoragePlaybackQualityStore,
  screenShortEdge,
} from "./app/settings/playback-quality";
import { applyThemePreference, createStorageThemePreferenceStore } from "./app/settings/theme";
import { browserScheduler } from "./ui-kit/scheduler";
import { handOverFromShell } from "./app/shell/app-shell";
import { consumeFirstLaunch, createStorageFirstLaunchStore } from "./app/start/first-launch";
import {
  createStorageRefusalNoticeStore,
  PersistencePrompt,
} from "./app/storage/persistence-prompt";
import { Toaster } from "./app/toast/toaster";
import { createDownloader } from "./app/glissando-file/download-file";
import { browserLaunchQueue } from "./app/glissando-file/launched-files";
import { browserObjectUrls } from "./app/media/object-urls";
import { browserMusicEditorAudio } from "./app/music-editor/music-editor-audio";
import { deviceSongStorage, serverSongStorage } from "./app/music-editor/song-intake";
import { freeStorageBytes } from "./library/free-storage";
import { decodePicture } from "./import/downscale";
import { browserIntakePorts } from "./app/import/browser-intake-ports";
import { HttpImmichClient } from "./immich/http-immich-client";
import type { ImmichUnavailableKind } from "./immich/immich-client";
import type { StoredSlideshow } from "./library/stored-slideshow";
import type { SlideshowHome } from "./app/routes/slideshow-storage";
import { browserNetworkStatus, ImmichAvailability } from "./immich/immich-availability";
import { convertMusic } from "./import/browser/convert-music";
import { probeMusic } from "./import/music-probe";
import { createMusicAudioContext, MusicOutput } from "./player";
import { BeatPass } from "./library/beat-pass";
import { FocusPass } from "./library/focus-pass";
import { openLibraryStore } from "./library/indexeddb-store";
import { startFocusWorker, WorkerFocusDetector } from "./focus/worker-focus-detector";
import { decodeMusicWithWebAudio } from "./beats/decode-music";
import { startBeatWorker, WorkerBeatDetector } from "./beats/worker-beat-detector";
import { requestPersistentStorage } from "./library/persistent-storage";
import { browserPwaPorts } from "./pwa/browser-pwa";
import { createStorageHintDismissalStore, PwaStatus } from "./pwa/pwa-status";
import { sweepPrivateExports } from "./video-export";
import { HttpServerLibraryClient } from "./server-library/http-server-library-client";
import { serverSlideshowSessions } from "./app/server-library/server-slideshow-sessions";
import { createServerLibrary } from "./server-library/server-library";
import { createStorageServerLibraryMemory } from "./server-library/server-library-memory";
import { browserHtmlExportDevice } from "./app/html-export/browser-html-export-device";
import { browserVideoExportDevice } from "./app/video-export/browser-video-export-device";
import { createFrameServices } from "./app/frame/frame-services";

/** Same origin: the self-hosted Glissando's `/immich/` route sets the API key (ADR-0013). */
const immichClient = new HttpImmichClient({
  baseUrl: new URL("./immich/", window.location.href),
  fetch: window.fetch.bind(window),
});
const immichAvailability = new ImmichAvailability({
  client: immichClient,
  network: browserNetworkStatus(window),
});

const settings = new AppSettings({
  themes: createStorageThemePreferenceStore(window.localStorage),
  playbackQualities: createStoragePlaybackQualityStore(window.localStorage),
  languages: createStorageLanguagePreferenceStore(window.localStorage),
  browserLanguages: window.navigator.languages,
});
const translator = new TranslatorState(createTranslator(settings.state.effectiveLanguage));
// Before anything awaits, so a pinned theme is in place for the first paint; a later choice
// in the settings sheet applies at once.
settings.subscribe(({ theme, effectiveLanguage }) => {
  applyThemePreference(document.documentElement, theme);
  document.documentElement.lang = effectiveLanguage;
  if (translator.current.language !== effectiveLanguage) {
    translator.current = createTranslator(effectiveLanguage);
  }
});

const target = document.getElementById("app");
if (!target) {
  throw new Error("Mount point #app is missing from index.html");
}
const shell = document.getElementById("app-shell");
if (!shell) {
  throw new Error("The app shell #app-shell is missing from index.html");
}

const toaster = new Toaster(browserScheduler);
const logError = (error: unknown): void => console.error(error);
const reportError = createErrorReporter({
  log: logError,
  toaster,
  text: () => translator.current.t("common.unexpectedError"),
});
window.addEventListener("error", (event) => reportError(event.error));
window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
immichAvailability.check().catch(reportError);

const refusalNotice = createStorageRefusalNoticeStore(window.localStorage);
// Before anything awaits, so the browser's install prompt is not missed.
const pwa = new PwaStatus(
  browserPwaPorts(window, {
    production: import.meta.env.PROD,
    hintDismissal: createStorageHintDismissalStore(window.localStorage),
    refusalTold: () => refusalNotice.wasShown(),
    onError: logError,
  }),
);
pwa.start().catch(reportError);

const store = await openLibraryStore(window.indexedDB);

const newId = (): string => randomId(crypto);
const now = (): Date => new Date();
const musicOutput = new MusicOutput(createMusicAudioContext);

function deleteAbandonedMedia(): void {
  store.deleteUnreferencedMedia(now()).catch(reportError);
}
deleteAbandonedMedia();
// Exports a crash or a closed tab left behind (video_export/WRITING_THE_FILE.md).
sweepPrivateExports().catch(logError);

const focusPass = new FocusPass({
  store,
  detector: new WorkerFocusDetector(startFocusWorker),
  log: logError,
  reportError,
});
focusPass.start();

const beatDetector = new WorkerBeatDetector(decodeMusicWithWebAudio, startBeatWorker);
const beatPass = new BeatPass({
  store,
  detector: beatDetector,
  log: logError,
  reportError,
});
beatPass.start();

const freeBytes = (): Promise<number | null> => freeStorageBytes(window.navigator.storage);
const download = createDownloader({
  document,
  urls: browserObjectUrls,
  scheduler: browserScheduler,
});

/** How Immich's pictures are read, for an intake, a server slideshow and a copy of one. */
const immichReaders = {
  client: immichClient,
  decode: decodePicture,
  reportUnavailable: (kind: ImmichUnavailableKind) => immichAvailability.report(kind),
  log: logError,
};

// Same origin: the self-hosted Glissando routes ./api/library to its library service (ADR-0018).
const serverLibraryClient = new HttpServerLibraryClient({
  appUrl: new URL("./", window.location.href),
  fetch: window.fetch.bind(window),
});
const serverLibrary = createServerLibrary({
  client: serverLibraryClient,
  immichAvailability,
  memory: createStorageServerLibraryMemory(window.localStorage, logError),
  immich: immichReaders,
  deviceStore: store,
  newId,
  now,
  log: logError,
});

// The first device to open a server slideshow listens for its music's beats and keeps them on
// the server for the others (ADR-0021). A server out of reach ends the pass without a message:
// the pictures share the music evenly, and the next opening tries again.
const serverBeatPass = new BeatPass({
  store: serverLibrary.store,
  detector: beatDetector,
  log: logError,
  reportError: logError,
});

const intakePorts = browserIntakePorts({
  immichClient,
  immichReaders,
  newId,
  now,
  onError: reportError,
  log: logError,
  toaster,
  translator,
});

const serverSessions = serverSlideshowSessions(window, {
  shareApi: serverLibraryClient,
  slideshows: serverLibrary.store,
  scheduler: browserScheduler,
  onTurnedOff: () => toaster.show({ text: translator.current.t("share.turnedOff"), tone: "info" }),
  onError: reportError,
  log: logError,
});
const frame = createFrameServices(window, browserScheduler, logError);

// Read before the navigator exists, so its own first route is never raced by this one.
const deepLinkedFrameAlbumId = parseFrameDeepLink(window.location.hash);
const navigator = new Navigator(createWindowHistory(window));
if (deepLinkedFrameAlbumId !== null) {
  openDeepLinkedFrame(
    deepLinkedFrameAlbumId,
    serverLibrary.availability,
    navigator,
    browserClearDeepLinkHash(window),
  );
}

const services = {
  store,
  navigator,
  toaster,
  reportError,
  settings,
  persistencePrompt: new PersistencePrompt(
    () => requestPersistentStorage(window.navigator.storage),
    refusalNotice,
  ),
  pwa,
  appAddress: window.location.origin,
  build: __GLISSANDO_BUILD_INFO__,
  launchQueue: browserLaunchQueue(window),
  musicOutput,
  musicAudio: browserMusicEditorAudio(musicOutput),
  focusPass,
  beatPass,
  serverBeatPass,
  immich: { client: immichClient, availability: immichAvailability },
  serverLibrary,
  newImportSession: () =>
    new ImportSession({
      ...intakePorts,
      store,
      probeMusic,
      convertMusic,
      createOnServer: (slideshow, songsAudio) =>
        serverLibrary.createSlideshow(slideshow, songsAudio),
    }),
  newAddPicturesSession: (slideshow: StoredSlideshow, home: SlideshowHome) =>
    new AddPicturesSession(slideshow, home, {
      ...intakePorts,
      store: home === "device" ? store : serverAddingStore(serverLibrary.store),
    }),
  songIntake: (home: SlideshowHome) => ({
    probeMusic,
    convertMusic,
    log: logError,
    storage:
      home === "device"
        ? deviceSongStorage({ store, newId, now })
        : serverSongStorage(serverLibrary),
  }),
  newId,
  now,
  screenShortEdge: () =>
    screenShortEdge({
      width: window.screen.width,
      height: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
    }),
  deleteAbandonedMedia,
  log: logError,
  freeBytes,
  download,
  videoExport: browserVideoExportDevice({ window, freeBytes, download, log: logError }),
  htmlExport: browserHtmlExportDevice({ window, download, log: logError }),
  ...serverSessions,
  reload: () => window.location.reload(),
  ...frame,
};

const playStartAnimation = consumeFirstLaunch(createStorageFirstLaunchStore(window.localStorage));
mount(App, {
  target,
  props: { services, playStartAnimation },
  context: translatorContext(translator),
});
handOverFromShell(shell).catch(reportError);
