import type { AddPicturesSession } from "./add-pictures/add-pictures-session";
import { AddPicturesFlow } from "./add-pictures/add-pictures-flow";
import { refusalToast } from "./editing/edit-refusal";
import { ExportJob } from "./glissando-file/export-job";
import { OpenFlow } from "./glissando-file/open-flow";
import type { Translator } from "./i18n/translator";
import { ImmichBrowsers } from "./immich/immich-browsers";
import { ImportFlow } from "./import/import-flow";
import type { ImportSession } from "./import/import-session";
import type { AppServices } from "./services";
import { DemoSlideshowFlow } from "./start/demo-slideshow-flow";

/** The app's long-running flows, wired to the services and worded by the translator. */
export function createAppFlows(
  services: AppServices,
  { t, formatBytes }: Pick<Translator, "t" | "formatBytes">,
) {
  const importFlow = new ImportFlow<ImportSession>({
    ...services,
    createdText: () => t("import.created"),
  });
  const addFlow = new AddPicturesFlow<AddPicturesSession>({
    ...services,
    newSession: (slideshow, home) => services.newAddPicturesSession(slideshow, home),
    goneText: () => t("slideshow.gone"),
    refusalToast: (reason) => refusalToast(reason, { t }),
  });
  const exportJob = new ExportJob({
    ...services,
    downloadedText: (fileName, bytes) =>
      t("glissandoFile.downloaded", { fileName, size: formatBytes(bytes) }),
    failedText: () => t("glissandoFile.exportFailed"),
    tryAgainLabel: () => t("glissandoFile.tryAgain"),
  });
  const openFlow = new OpenFlow({
    ...services,
    afterCreate: () => void importFlow.afterCreate(),
    openedText: (title) => t("glissandoFile.opened", { title }),
    openedAsText: (title, original) => t("glissandoFile.openedAs", { title, original }),
    cancelledText: () => t("glissandoFile.cancelled"),
  });
  const { immich } = services;
  const immichBrowsers = new ImmichBrowsers({
    client: immich.client,
    reportUnavailable: (kind) => immich.availability.report(kind),
  });
  const demoSlideshowFlow = new DemoSlideshowFlow({
    url: services.demoSlideshow.config.url,
    download: services.demoSlideshow.download,
    connectivity: services.demoSlideshow.connectivity,
    openFile: (file) => void openFlow.open(file, "library"),
    toaster: services.toaster,
    failedText: () => t("start.demoLoadFailed"),
  });
  return { importFlow, addFlow, exportJob, openFlow, immichBrowsers, demoSlideshowFlow };
}
