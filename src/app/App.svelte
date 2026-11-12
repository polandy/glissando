<script lang="ts">
  import { onMount } from "svelte";
  import { statusBarView, type PwaState } from "../pwa/status-bar-view";
  import type { ImmichAvailabilityState } from "../immich/immich-availability";
  import { createAppActions } from "./app-actions";
  import type { AddedPictures } from "./add-pictures/add-pictures-flow";
  import type { AddPicturesSession } from "./add-pictures/add-pictures-session";
  import { createAppFlows } from "./app-flows";
  import { subscribeAppState } from "./app-subscriptions";
  import AppOverlays from "./AppOverlays.svelte";
  import type { ExportProgress } from "./glissando-file/export-job";
  import { runningInHeader, setExportStatus } from "./glissando-file/export-status";
  import { setFocusSearchStatus } from "./focus-search-status";
  import type { OpenFlowState, OpenOrigin } from "./glissando-file/open-flow";
  import { getTranslator } from "./i18n/context";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import { startPlaying } from "./navigation/start-playing";
  import type { PwaSheetContent } from "./pwa/pwa-sheet-content";
  import StatusBar from "./pwa/StatusBar.svelte";
  import HomeRoutes from "./routes/HomeRoutes.svelte";
  import IntakeRoutes from "./routes/IntakeRoutes.svelte";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import { leaveWithToast } from "./routes/slideshow-exits";
  import { existingSlideshowsOf } from "./import/existing-slideshows";
  import { openedSlideshowOf } from "./routes/opened-slideshow";
  import RouteSkeleton from "./routes/RouteSkeleton.svelte";
  import { serverRouteStore, type RouteStore } from "./routes/slideshow-home";
  import type { SlideshowHome } from "./routes/slideshow-storage";
  import type { AppServices } from "./services";
  import type { SettingsState } from "./settings/app-settings";
  import { effectivePlaybackQuality } from "./settings/playback-quality";
  import type { ToastMessage } from "./toast/toaster";
  import { ServerCopyFlows } from "./server-library/server-copy-flows";
  import type { ServerLibraryState } from "../server-library/server-library-availability";
  import type { RunningSearch } from "../library/running-search";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, settings, newId, now, random, pwa, immich } =
    services;
  const translator = getTranslator();
  const { t } = translator;
  // svelte-ignore state_referenced_locally
  const { importFlow, addFlow, exportJob, openFlow, immichBrowsers, demoSlideshowFlow } =
    createAppFlows(services, translator);

  // svelte-ignore state_referenced_locally
  const serverCopies = new ServerCopyFlows({
    serverLibrary: services.serverLibrary,
    deviceStore: store,
    toaster,
    open: (slideshowId) => navigator.open({ screen: "slideshow", slideshowId }),
    addFiles: (copy, files) => addFlow.open(copy, "device", files),
    reportError,
    log: services.log,
    translator,
  });
  // svelte-ignore state_referenced_locally
  const serverRoute = serverRouteStore(services.serverLibrary.store);
  const openedSlideshow = openedSlideshowOf({
    device: store,
    server: serverRoute,
    reportError,
    leave: () => navigator.back(),
  });
  // svelte-ignore state_referenced_locally
  let serverState = $state.raw<ServerLibraryState>(services.serverLibrary.availability.state);
  // svelte-ignore state_referenced_locally
  let frameCardShown = $state(services.frameCardPreference.shown);

  let route = $state.raw<Route>(navigator.route);
  let exportProgress = $state.raw<ExportProgress | null>(null);
  let serverCopyProgress = $state.raw<readonly ExportProgress[]>([]);
  let openState = $state.raw<OpenFlowState>(openFlow.state);
  setExportStatus({
    get running() {
      return runningInHeader(exportProgress, serverCopyProgress);
    },
  });
  let focusSearch = $state.raw<RunningSearch | null>(null);
  setFocusSearchStatus({
    get current() {
      return focusSearch;
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

  onMount(() =>
    subscribeAppState(
      services,
      { importFlow, addFlow, exportJob, openFlow, serverCopies },
      {
        setRoute: (next) => (route = next),
        stopLogoPlaying: () => (logoPlays = false),
        setToast: (next) => (toast = next),
        setSettingsState: (next) => (settingsState = next),
        setExportProgress: (next) => (exportProgress = next),
        setServerCopies: (next) => (serverCopyProgress = next),
        setFocusSearch: (next) => (focusSearch = next),
        setOpenState: (next) => (openState = next),
        setImportSession: (session, refused) => {
          importSession = session;
          persistRefused = refused;
        },
        setAddState: (session, pictures) => {
          addSession = session;
          added = pictures;
        },
        setPwaState: (next) => (pwaState = next),
        setImmichState: (next) => (immichState = next),
        setServerState: (next) => (serverState = next),
        setFrameCardShown: (next) => (frameCardShown = next),
      },
      () => route,
    ),
  );

  const noticeFor = (origin: OpenOrigin) =>
    openState.notice?.origin === origin ? openState.notice : null;

  // svelte-ignore state_referenced_locally
  const actions = createAppActions(services, t, (sheet) => (pwaSheet = sheet));
  // svelte-ignore state_referenced_locally
  const serverMemory = services.serverLibrary.memory;
  let rememberedHome = $state<SlideshowHome>(serverMemory.newSlideshowHome());

  function homeChosen(home: SlideshowHome): void {
    rememberedHome = home;
    serverMemory.rememberNewSlideshowHome(home);
  }

  /** A server slideshow's pictures in the making are linked: their media is Immich's. */
  const importStore = (): RouteStore =>
    importSession?.choices.current().home === "server" ? serverRoute : store;

  const existingSlideshows = () =>
    existingSlideshowsOf(
      { device: store, server: serverRoute },
      importSession?.choices.current().home === "server",
    );
</script>

{#snippet statusBar()}
  <StatusBar
    view={statusBarView(pwaState)}
    onAction={actions.statusBarAction}
    onDismissHint={() => pwa.dismissHint()}
  />
{/snippet}

{#if route.screen === "start" || route.screen === "settings" || route.screen === "frame" || route.screen === "frameSetup"}
  <HomeRoutes
    {route}
    {services}
    {importFlow}
    {openFlow}
    {actions}
    {statusBar}
    {logoPlays}
    {pwaState}
    {serverState}
    {frameCardShown}
    {settingsState}
    {immichState}
    notice={noticeFor("library")}
    onDismissNotice={() => openFlow.dismissNotice()}
    demoSlideshow={demoSlideshowFlow}
  />
{:else if route.screen === "import" && importSession !== null}
  <ImportRoute
    step={route.step}
    session={importSession}
    loadExistingSlideshows={existingSlideshows}
    loadThumbnail={(id) => importStore().thumbnailBlob(id)}
    loadPicture={(id) => importStore().playbackPictureBlob(id)}
    onError={reportError}
    serverOn={serverState.kind === "on"}
    {rememberedHome}
    onHomeChosen={homeChosen}
    onCreateFailed={actions.createFailed}
    onToMusic={() => navigator.open({ screen: "import", step: "music" })}
    onBack={() => navigator.back()}
    guardLeave={(guard) => navigator.guardLeave(guard)}
    onDiscard={(leave) => void importFlow.discard(leave)}
    onCreated={(slideshow) => void importFlow.created(slideshow.id)}
    onOpenFile={(file) => void openFlow.open(file, "pictures")}
    notice={noticeFor("pictures")}
    onDismissNotice={() => openFlow.dismissNotice()}
    onReload={services.reload}
    immich={immichState}
    onOpenImmich={() => navigator.open({ screen: "immich", opened: null, slideshowId: null })}
    onImmichSettings={() => navigator.open({ screen: "settings" })}
    samplePreview={services.samplePreview}
    {toaster}
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
    onCopyAndAdd={(slideshow, files) => void serverCopies.keepCopyAndAdd(slideshow, files)}
  />
{:else if route.screen === "slideshow" || route.screen === "player" || route.screen === "picture" || route.screen === "music"}
  {@const slideshowId = route.slideshowId}
  {#key slideshowId}
    {#await openedSlideshow(slideshowId)}
      <RouteSkeleton variant="strip" />
    {:then opened}
      {@const onDevice = opened.home === "device"}
      {@const pulsePlay = importFlow.takePlayPulse(slideshowId)}
      <SlideshowRoute
        store={opened.store}
        focusPass={onDevice ? services.focusPass : services.serverFocusPass}
        analysisPass={onDevice ? services.analysisPass : services.serverAnalysisPass}
        {toaster}
        {newId}
        {now}
        {random}
        {slideshowId}
        {exportProgress}
        onExport={() => exportJob.start(slideshowId, opened.store)}
        videoExport={services.videoExport}
        htmlExport={services.htmlExport}
        playing={route.screen === "player" ? { pictureId: route.pictureId ?? null } : null}
        {pulsePlay}
        playbackQuality={effectivePlaybackQuality(
          settingsState.playbackQuality,
          services.screenShortEdge(),
        )}
        editingPictureId={route.screen === "picture" ? route.pictureId : null}
        editingMusic={route.screen === "music"}
        musicAudio={services.musicAudio}
        musicOutput={services.musicOutput}
        decodeClipSound={services.decodeClipSound}
        readClipPeaks={services.readClipPeaks}
        songIntake={services.songIntake(opened.home)}
        samplePreview={services.samplePreview}
        fineSettingsFold={services.fineSettingsFold}
        musicEditorDetails={services.musicEditorDetails}
        onBack={() => navigator.back()}
        onPlay={() => startPlaying(services, slideshowId)}
        onPlayFrom={(pictureId) => startPlaying(services, slideshowId, pictureId)}
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
        serverSessions={services}
      />
    {:catch}
      <!-- A failed lookup has already left for the parent screen. -->
    {/await}
  {/key}
{/if}

<AppOverlays
  {openState}
  {toast}
  {persistRefused}
  {pwaSheet}
  {pwaState}
  onCancelOpen={() => openFlow.cancel()}
  onToastAction={() => toaster.act()}
  onDismissToast={() => toaster.dismiss()}
  onPersistUnderstood={() => importFlow.dismissPersistNotice()}
  onInstall={actions.install}
  onClosePwaSheet={() => (pwaSheet = null)}
  tvAtStart={services.tvAtStart}
/>
