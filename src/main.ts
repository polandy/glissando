import { mount } from "svelte";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./app/App.svelte";
import { createErrorReporter } from "./app/errors/error-reporter";
import { translatorContext } from "./app/i18n/context";
import { createTranslator, pickLanguage } from "./app/i18n/translator";
import { ImportSession } from "./app/import/import-session";
import { createWindowHistory, Navigator } from "./app/navigation/navigator";
import { randomId } from "./app/random-id";
import { browserScheduler } from "./app/scheduler";
import { consumeFirstLaunch, createStorageFirstLaunchStore } from "./app/start/first-launch";
import {
  createStorageRefusalNoticeStore,
  PersistencePrompt,
} from "./app/storage/persistence-prompt";
import { Toaster } from "./app/toast/toaster";
import { decodePicture } from "./import/downscale";
import { captureDate } from "./import/exif-capture-date";
import { probeMusic } from "./import/music-probe";
import { openLibraryStore } from "./library/indexeddb-store";
import { requestPersistentStorage } from "./library/persistent-storage";

const target = document.getElementById("app");
if (!target) {
  throw new Error("Mount point #app is missing from index.html");
}

const translator = createTranslator(pickLanguage(navigator.languages));
const toaster = new Toaster(browserScheduler);
const reportError = createErrorReporter({
  log: (error) => console.error(error),
  toaster,
  text: translator.t("common.unexpectedError"),
});
window.addEventListener("error", (event) => reportError(event.error));
window.addEventListener("unhandledrejection", (event) => reportError(event.reason));

const store = await openLibraryStore(window.indexedDB);

function deleteAbandonedMedia(): void {
  store.deleteUnreferencedMedia(new Date()).catch(reportError);
}
deleteAbandonedMedia();

const services = {
  store,
  navigator: new Navigator(createWindowHistory(window)),
  toaster,
  reportError,
  persistencePrompt: new PersistencePrompt(
    () => requestPersistentStorage(window.navigator.storage),
    createStorageRefusalNoticeStore(window.localStorage),
  ),
  newImportSession: () =>
    new ImportSession({
      store,
      decode: decodePicture,
      captureDate,
      probeMusic,
      newId: () => randomId(crypto),
      now: () => new Date(),
      onError: reportError,
    }),
  deleteAbandonedMedia,
};

const playStartAnimation = consumeFirstLaunch(createStorageFirstLaunchStore(window.localStorage));
mount(App, {
  target,
  props: { services, playStartAnimation },
  context: translatorContext(translator),
});
