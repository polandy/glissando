<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "./components/Dialog.svelte";
  import { ExportJob, type ExportProgress } from "./glissando-file/export-job";
  import { setExportStatus } from "./glissando-file/export-status";
  import { OpenFlow, type OpenFlowState, type OpenOrigin } from "./glissando-file/open-flow";
  import OpeningOverlay from "./glissando-file/OpeningOverlay.svelte";
  import Toast from "./components/Toast.svelte";
  import { getTranslator } from "./i18n/context";
  import { ImportFlow } from "./import/import-flow";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import { leaveWithToast } from "./routes/slideshow-exits";
  import StartRoute from "./routes/StartRoute.svelte";
  import type { AppServices } from "./services";
  import type { SettingsState } from "./settings/app-settings";
  import SettingsSheet from "./settings/SettingsSheet.svelte";
  import type { ToastMessage } from "./toast/toaster";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, settings, newId, now } = services;
  const { t, formatBytes } = getTranslator();
  // svelte-ignore state_referenced_locally
  const importFlow = new ImportFlow<ImportSession>({
    ...services,
    createdText: () => t("import.created"),
  });

  // svelte-ignore state_referenced_locally
  const exportJob = new ExportJob({
    ...services,
    downloadedText: (fileName, bytes) =>
      t("glissandoFile.downloaded", { fileName, size: formatBytes(bytes) }),
    failedText: () => t("glissandoFile.exportFailed"),
    tryAgainLabel: () => t("glissandoFile.tryAgain"),
  });
  // svelte-ignore state_referenced_locally
  const openFlow = new OpenFlow({
    ...services,
    afterCreate: () => void importFlow.afterCreate(),
    openedText: (title) => t("glissandoFile.opened", { title }),
    openedAsText: (title, original) => t("glissandoFile.openedAs", { title, original }),
    cancelledText: () => t("glissandoFile.cancelled"),
  });

  let route = $state.raw<Route>(navigator.route);
  let exportProgress = $state.raw<ExportProgress | null>(null);
  let openState = $state.raw<OpenFlowState>(openFlow.state);
  setExportStatus({
    get current() {
      return exportProgress;
    },
  });
  let toast = $state.raw<ToastMessage | null>(toaster.current);
  let settingsState = $state.raw<SettingsState>(settings.state);
  let importSession = $state.raw<ImportSession | null>(null);
  let persistRefused = $state(false);
  // The logo animates on the first launch only, not on every return to the start screen.
  // svelte-ignore state_referenced_locally
  let logoPlays = $state(playStartAnimation);

  onMount(() => {
    const stopRoute = navigator.subscribe((next) => {
      if (next.screen !== "start" && next.screen !== "settings") {
        logoPlays = false;
      }
      if (next.screen === "import") {
        importFlow.ensureSession();
      }
      // A refused file's notice belongs to the screen it was opened from.
      if (next.screen !== route.screen) {
        openFlow.dismissNotice();
      }
      route = next;
    });
    const stopToast = toaster.subscribe((next) => (toast = next));
    const stopSettings = settings.subscribe((next) => (settingsState = next));
    const stopExport = exportJob.subscribe((next) => (exportProgress = next));
    const stopOpen = openFlow.subscribe((next) => (openState = next));
    const stopImport = importFlow.subscribe((next) => {
      importSession = next.session;
      persistRefused = next.persistRefused;
    });
    return () => {
      stopRoute();
      stopToast();
      stopSettings();
      stopImport();
      stopExport();
      stopOpen();
    };
  });

  function noticeFor(origin: OpenOrigin) {
    return openState.notice?.origin === origin ? openState.notice : null;
  }

  function musicUnreadable(retry: () => void): void {
    toaster.show({
      text: t("import.musicUnreadable"),
      tone: "error",
      action: { label: t("common.retry"), run: retry },
    });
  }
</script>

{#if route.screen === "start" || route.screen === "settings"}
  <StartRoute
    {store}
    playStartAnimation={logoPlays}
    onError={reportError}
    onCreate={() => importFlow.open()}
    onOpen={(slideshowId) => navigator.open({ screen: "slideshow", slideshowId })}
    onSettings={() => navigator.open({ screen: "settings" })}
    onOpenFile={(file) => void openFlow.open(file, "library")}
    notice={noticeFor("library")}
    onDismissNotice={() => openFlow.dismissNotice()}
    onReload={services.reload}
  />
  {#if route.screen === "settings"}
    <SettingsSheet
      state={settingsState}
      onTheme={(theme) => settings.setTheme(theme)}
      onLanguage={(language) => settings.setLanguage(language)}
      onClose={() => navigator.back()}
    />
  {/if}
{:else if route.screen === "import" && importSession !== null}
  <ImportRoute
    step={route.step}
    session={importSession}
    loadThumbnail={(id) => store.thumbnailBlob(id)}
    onError={reportError}
    onMusicUnreadable={musicUnreadable}
    onToMusic={() => navigator.open({ screen: "import", step: "music" })}
    onBack={() => navigator.back()}
    onDiscard={(leave) => void importFlow.discard(leave)}
    onCreated={(slideshow) => void importFlow.created(slideshow.id)}
    onOpenFile={(file) => void openFlow.open(file, "pictures")}
    notice={noticeFor("pictures")}
    onDismissNotice={() => openFlow.dismissNotice()}
    onReload={services.reload}
  />
{:else if route.screen === "slideshow" || route.screen === "player"}
  {@const slideshowId = route.slideshowId}
  {#key slideshowId}
    <SlideshowRoute
      {store}
      {toaster}
      {newId}
      {now}
      {slideshowId}
      {exportProgress}
      onExport={() => void exportJob.start(slideshowId)}
      playing={route.screen === "player"}
      onBack={() => navigator.back()}
      onPlay={() => navigator.open({ screen: "player", slideshowId })}
      onDeleted={() => leaveWithToast({ navigator, toaster }, t("slideshow.deleted"))}
      onGone={() => leaveWithToast({ navigator, toaster }, t("slideshow.gone"))}
      onError={reportError}
    />
  {/key}
{/if}

{#if openState.opening !== null}
  <OpeningOverlay opening={openState.opening} onCancel={() => openFlow.cancel()} />
{/if}

{#if toast !== null}
  <Toast {toast} onAction={() => toaster.act()} onDismiss={() => toaster.dismiss()} />
{/if}

{#if persistRefused}
  <Dialog
    title={t("storage.persistRefusedTitle")}
    message={t("storage.persistRefusedText")}
    actions={[
      {
        label: t("common.understood"),
        tone: "primary",
        onSelect: () => importFlow.dismissPersistNotice(),
      },
    ]}
  />
{/if}
