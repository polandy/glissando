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
  import type { AddedPictures } from "./add-pictures/add-pictures-flow";
  import type { AddPicturesSession } from "./add-pictures/add-pictures-session";
  import { createAppFlows } from "./app-flows";
  import type { ExportProgress } from "./glissando-file/export-job";
  import { setExportStatus } from "./glissando-file/export-status";
  import { openLaunchedFiles } from "./glissando-file/launched-files";
  import type { OpenFlowState, OpenOrigin } from "./glissando-file/open-flow";
  import OpeningOverlay from "./glissando-file/OpeningOverlay.svelte";
  import Toast from "./components/Toast.svelte";
  import { getTranslator } from "./i18n/context";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import PwaSheet, { type PwaSheetContent } from "./pwa/PwaSheet.svelte";
  import StatusBar from "./pwa/StatusBar.svelte";
  import IntakeRoutes from "./routes/IntakeRoutes.svelte";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import { leaveWithToast } from "./routes/slideshow-exits";
  import { findSlideshowHome, serverRouteStore, type RouteStore } from "./routes/slideshow-home";
  import type { SlideshowHome } from "./routes/slideshow-storage";
  import StartRoute from "./routes/StartRoute.svelte";
  import type { AppServices } from "./services";
  import type { SettingsState } from "./settings/app-settings";
  import SettingsSheet from "./settings/SettingsSheet.svelte";
  import PersistRefusedDialog from "./storage/PersistRefusedDialog.svelte";
  import type { ToastMessage } from "./toast/toaster";
  import { ServerCopyFlows } from "./server-library/server-copy-flows";
  import type { ServerLibraryState } from "../server-library/server-library-availability";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, settings, newId, now, pwa, immich } = services;
  const translator = getTranslator();
  const { t } = translator;
  // svelte-ignore state_referenced_locally
  const { importFlow, addFlow, exportJob, openFlow, immichBrowsers } = createAppFlows(
    services,
    translator,
  );

  // svelte-ignore state_referenced_locally
  const serverCopies = new ServerCopyFlows({
    serverLibrary: services.serverLibrary,
    deviceStore: store,
    toaster,
    open: (slideshowId) => navigator.open({ screen: "slideshow", slideshowId }),
    reportError,
    log: services.log,
    translator,
  });
  // svelte-ignore state_referenced_locally
  const serverRoute = serverRouteStore(services.serverLibrary.store);

  /** A slideshow opened by id, with the store of where it lives. */
  async function openedSlideshow(
    slideshowId: string,
  ): Promise<{ home: SlideshowHome; store: RouteStore }> {
    try {
      const home = await findSlideshowHome(slideshowId, store);
      return { home, store: home === "device" ? store : serverRoute };
    } catch (error) {
      reportError(error);
      throw error;
    }
  }
  // svelte-ignore state_referenced_locally
  let serverState = $state.raw<ServerLibraryState>(services.serverLibrary.availability.state);

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
  let addSession = $state.raw<AddPicturesSession | null>(null);
  let added = $state.raw<AddedPictures | null>(null);
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
      if (next.screen === "import" || (next.screen === "immich" && next.slideshowId === null)) {
        importFlow.ensureSession();
      }
      addFlow.follow(next);
      if ((next.screen === "import" && next.step === "pictures") || next.screen === "add") {
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
    const stopAdd = addFlow.subscribe((next) => {
      addSession = next.session;
      added = next.added;
    });
    const stopImport = importFlow.subscribe((next) => {
      importSession = next.session;
      persistRefused = next.persistRefused;
      if (next.persistRefused) {
        pwa.storageRefusalTold();
      }
    });
    const stopPwa = pwa.subscribe((next) => (pwaState = next));
    const stopImmich = immich.availability.subscribe((next) => (immichState = next));
    const stopServer = services.serverLibrary.availability.subscribe(
      (next) => (serverState = next),
    );
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
      stopAdd();
      stopExport();
      stopOpen();
      stopPwa();
      stopImmich();
      stopServer();
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

  // svelte-ignore state_referenced_locally
  const serverMemory = services.serverLibrary.memory;
  let rememberedHome = $state<SlideshowHome>(serverMemory.newSlideshowHome());

  function homeChosen(home: SlideshowHome): void {
    rememberedHome = home;
    serverMemory.rememberNewSlideshowHome(home);
  }

  /** A server slideshow's pictures in the making are linked: their thumbnails are Immich's. */
  function importThumbnail(pictureId: string): Promise<Blob> {
    const home = importSession?.choices.current().home;
    return (home === "server" ? serverRoute : store).thumbnailBlob(pictureId);
  }

  function createFailed(retry: () => void): void {
    toaster.show({
      text: t("server.createFailed"),
      tone: "error",
      action: { label: t("server.tryAgain"), run: retry },
    });
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
    serverLibrary={services.serverLibrary}
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
    loadThumbnail={importThumbnail}
    onError={reportError}
    onMusicUnreadable={musicUnreadable}
    serverOn={serverState.kind === "on"}
    {rememberedHome}
    onHomeChosen={homeChosen}
    onCreateFailed={createFailed}
    onToMusic={() => navigator.open({ screen: "import", step: "music" })}
    onBack={() => navigator.back()}
    onDiscard={(leave) => void importFlow.discard(leave)}
    onCreated={(slideshow) => void importFlow.created(slideshow.id)}
    onOpenFile={(file) => void openFlow.open(file, "pictures")}
    notice={noticeFor("pictures")}
    onDismissNotice={() => openFlow.dismissNotice()}
    onReload={services.reload}
    immich={immichState}
    onOpenImmich={() => navigator.open({ screen: "immich", albumId: null, slideshowId: null })}
    onImmichSettings={() => navigator.open({ screen: "settings" })}
  />
{:else if route.screen === "add" || route.screen === "immich"}
  <IntakeRoutes
    {route}
    {importSession}
    {addSession}
    {addFlow}
    {immichBrowsers}
    {services}
    {immichState}
  />
{:else if route.screen === "slideshow" || route.screen === "player" || route.screen === "picture" || route.screen === "music"}
  {@const slideshowId = route.slideshowId}
  {#key slideshowId}
    {#await openedSlideshow(slideshowId) then opened}
      <SlideshowRoute
        store={opened.store}
        focusPass={services.focusPass}
        {toaster}
        {newId}
        {now}
        {slideshowId}
        {exportProgress}
        onExport={() => void exportJob.start(slideshowId, opened.store)}
        videoExport={services.videoExport}
        htmlExport={services.htmlExport}
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
        onAddPictures={(slideshow) => addFlow.open(slideshow, opened.home)}
        addedPictureIds={added?.slideshowId === slideshowId ? added.pictureIds : []}
        onEdit={(pictureId) => navigator.open({ screen: "picture", slideshowId, pictureId })}
        onEditMusic={() => navigator.open({ screen: "music", slideshowId })}
        onDeleted={() => leaveWithToast({ navigator, toaster }, t("slideshow.deleted"))}
        onGone={() => leaveWithToast({ navigator, toaster }, t("slideshow.gone"))}
        onError={reportError}
        log={services.log}
        home={opened.home}
        serverOn={serverState.kind === "on"}
        onKeepCopy={(slideshow) => void serverCopies.keepCopy(slideshow)}
        onSaveOnServer={(slideshow) => void serverCopies.saveOnServer(slideshow)}
      />
    {/await}
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
