<script lang="ts">
  import { onMount } from "svelte";
  import {
    installOffer,
    statusBarView,
    type InstallOffer,
    type PwaState,
    type StatusBarAction,
  } from "../pwa/status-bar-view";
  import type { ImmichAvailabilityState } from "../immich/immich-availability";
  import { ImmichBrowser } from "./immich/immich-browser";
  import ImmichRoute from "./immich/ImmichRoute.svelte";
  import { ExportJob, type ExportProgress } from "./glissando-file/export-job";
  import { setExportStatus } from "./glissando-file/export-status";
  import { openLaunchedFiles } from "./glissando-file/launched-files";
  import { OpenFlow, type OpenFlowState, type OpenOrigin } from "./glissando-file/open-flow";
  import OpeningOverlay from "./glissando-file/OpeningOverlay.svelte";
  import Toast from "./components/Toast.svelte";
  import { getTranslator } from "./i18n/context";
  import { ImportFlow } from "./import/import-flow";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import PwaSheet, { type PwaSheetContent } from "./pwa/PwaSheet.svelte";
  import StatusBar from "./pwa/StatusBar.svelte";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import { leaveWithToast } from "./routes/slideshow-exits";
  import StartRoute from "./routes/StartRoute.svelte";
  import type { AppServices } from "./services";
  import type { SettingsState } from "./settings/app-settings";
  import SettingsSheet from "./settings/SettingsSheet.svelte";
  import PersistRefusedDialog from "./storage/PersistRefusedDialog.svelte";
  import type { ToastMessage } from "./toast/toaster";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, settings, newId, now, pwa, immich } = services;
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
  /** The Immich browser's selection and lists belong to the import session they feed. */
  let immichBrowser = $state.raw<ImmichBrowser | null>(null);
  let immichState = $state.raw<ImmichAvailabilityState>(immich.availability.state);
  let persistRefused = $state(false);
  let pwaState = $state.raw<PwaState>(pwa.state);
  let pwaSheet = $state.raw<PwaSheetContent | null>(null);
  // The logo animates on the first launch only, not on every return to the start screen.
  // svelte-ignore state_referenced_locally
  let logoPlays = $state(playStartAnimation);

  onMount(() => {
    const stopRoute = navigator.subscribe((next) => {
      if (next.screen !== "start" && next.screen !== "settings") {
        logoPlays = false;
      }
      if (next.screen === "import" || next.screen === "immich") {
        importFlow.ensureSession();
      }
      if (next.screen === "import" && next.step === "pictures") {
        immich.availability.check().catch(reportError);
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
      if (next.session !== importSession) {
        immichBrowser =
          next.session === null
            ? null
            : new ImmichBrowser({
                client: immich.client,
                reportUnavailable: (kind) => immich.availability.report(kind),
              });
      }
      importSession = next.session;
      persistRefused = next.persistRefused;
      if (next.persistRefused) {
        pwa.storageRefusalTold();
      }
    });
    const stopPwa = pwa.subscribe((next) => (pwaState = next));
    const stopImmich = immich.availability.subscribe((next) => (immichState = next));
    // A double-clicked file starts a new window (`launch_handler`), so it opens from the library.
    openLaunchedFiles(services.launchQueue, {
      open: (file) => openFlow.open(file, "library"),
      reportError,
    });
    return () => {
      stopRoute();
      stopToast();
      stopSettings();
      stopImport();
      stopExport();
      stopOpen();
      stopPwa();
      stopImmich();
    };
  });

  function noticeFor(origin: OpenOrigin) {
    return openState.notice?.origin === origin ? openState.notice : null;
  }

  function install(offer: InstallOffer): void {
    if (offer.kind === "installPrompt") {
      pwa.install().catch(reportError);
    } else {
      pwaSheet = { kind: "guide", guide: offer.guide };
    }
  }

  function statusBarAction(action: StatusBarAction): void {
    switch (action.kind) {
      case "none":
        return;
      case "reload":
        pwa.reload();
        return;
      case "why":
        pwaSheet = { kind: "why", address: services.appAddress };
        return;
      default:
        install(action);
    }
  }

  function musicUnreadable(retry: () => void): void {
    toaster.show({
      text: t("import.musicUnreadable"),
      tone: "error",
      action: { label: t("common.retry"), run: retry },
    });
  }
</script>

{#snippet statusBar()}
  <StatusBar
    view={statusBarView(pwaState)}
    onAction={statusBarAction}
    onDismissHint={() => pwa.dismissHint()}
  />
{/snippet}

{#if route.screen === "start" || route.screen === "settings"}
  <StartRoute
    {store}
    focusPass={services.focusPass}
    playStartAnimation={logoPlays}
    onError={reportError}
    onCreate={() => importFlow.open()}
    onOpen={(slideshowId) => navigator.open({ screen: "slideshow", slideshowId })}
    onSettings={() => navigator.open({ screen: "settings" })}
    onOpenFile={(file) => void openFlow.open(file, "library")}
    notice={noticeFor("library")}
    onDismissNotice={() => openFlow.dismissNotice()}
    onReload={services.reload}
    {statusBar}
  />
  {#if route.screen === "settings"}
    <SettingsSheet
      state={settingsState}
      immich={immichState}
      onCheckImmich={() => immich.availability.check().catch(reportError)}
      onReload={services.reload}
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
    immich={immichState}
    onOpenImmich={() => navigator.open({ screen: "immich", albumId: null })}
    onImmichSettings={() => navigator.open({ screen: "settings" })}
  />
{:else if route.screen === "immich" && importSession !== null && immichBrowser !== null}
  {@const session = importSession}
  <ImmichRoute
    browser={immichBrowser}
    albumId={route.albumId}
    thumbnailUrl={(photoId) => immich.client.thumbnailUrl(photoId)}
    onBack={() => navigator.back()}
    onOpenAlbum={(album) => navigator.open({ screen: "immich", albumId: album.id })}
    onAdd={(photos) => {
      session.addImmichPhotos(photos);
      navigator.open({ screen: "import", step: "pictures" });
    }}
    onError={reportError}
    onReload={services.reload}
  />
{:else if route.screen === "slideshow" || route.screen === "player" || route.screen === "picture" || route.screen === "music"}
  {@const slideshowId = route.slideshowId}
  {#key slideshowId}
    <SlideshowRoute
      {store}
      focusPass={services.focusPass}
      {toaster}
      {newId}
      {now}
      {slideshowId}
      {exportProgress}
      onExport={() => void exportJob.start(slideshowId)}
      videoExport={services.videoExport}
      playing={route.screen === "player"}
      editingPictureId={route.screen === "picture" ? route.pictureId : null}
      editingMusic={route.screen === "music"}
      musicAudio={services.musicAudio}
      musicOutput={services.musicOutput}
      onBack={() => navigator.back()}
      onPlay={() => {
        // Within the Play gesture: the player starts the music only after its pictures load.
        services.musicOutput.unlock();
        navigator.open({ screen: "player", slideshowId });
      }}
      onEdit={(pictureId) => navigator.open({ screen: "picture", slideshowId, pictureId })}
      onEditMusic={() => navigator.open({ screen: "music", slideshowId })}
      onDeleted={() => leaveWithToast({ navigator, toaster }, t("slideshow.deleted"))}
      onGone={() => leaveWithToast({ navigator, toaster }, t("slideshow.gone"))}
      onError={reportError}
      log={services.log}
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
  <PersistRefusedDialog
    offer={installOffer(pwaState)}
    onUnderstood={() => importFlow.dismissPersistNotice()}
    onInstall={install}
  />
{/if}

{#if pwaSheet !== null}
  <PwaSheet sheet={pwaSheet} onClose={() => (pwaSheet = null)} />
{/if}
