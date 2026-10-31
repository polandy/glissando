<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { ServerLibraryState } from "../../server-library/server-library-availability";
  import type { AppActions } from "../app-actions";
  import type { OpenFlow, OpenNotice } from "../glissando-file/open-flow";
  import type { ImportFlow } from "../import/import-flow";
  import type { ImportSession } from "../import/import-session";
  import type { Route } from "../navigation/route";
  import type { PwaState } from "../../pwa/status-bar-view";
  import FrameRoutes from "../frame/FrameRoutes.svelte";
  import type { AppServices } from "../services";
  import type { SettingsState } from "../settings/app-settings";
  import type { DemoSlideshowFlow } from "../start/demo-slideshow-flow";
  import SettingsSheet from "../settings/SettingsSheet.svelte";
  import StartRoute from "./StartRoute.svelte";

  /** The start screen, its settings sheet and the picture-frame set-up, by `route.screen`. */
  let {
    route,
    services,
    importFlow,
    openFlow,
    actions,
    statusBar,
    logoPlays,
    pwaState,
    serverState,
    frameCardShown,
    settingsState,
    immichState,
    notice,
    onDismissNotice,
    demoSlideshow,
  }: {
    route: Extract<Route, { screen: "start" | "settings" | "frame" | "frameSetup" }>;
    services: AppServices;
    importFlow: ImportFlow<ImportSession>;
    openFlow: OpenFlow;
    actions: AppActions;
    statusBar: Snippet;
    logoPlays: boolean;
    pwaState: PwaState;
    serverState: ServerLibraryState;
    frameCardShown: boolean;
    settingsState: SettingsState;
    immichState: ImmichAvailabilityState;
    notice: OpenNotice | null;
    onDismissNotice: () => void;
    demoSlideshow: DemoSlideshowFlow;
  } = $props();

  // svelte-ignore state_referenced_locally
  const { store, serverLibrary, navigator, reportError, settings, pwa, immich } = services;
</script>

{#if route.screen === "start" || route.screen === "settings" || route.screen === "frame"}
  <StartRoute
    {store}
    {serverLibrary}
    focusPass={services.focusPass}
    serverFocusPass={services.serverFocusPass}
    playStartAnimation={logoPlays}
    onError={reportError}
    onCreate={() => importFlow.open()}
    onOpen={(slideshowId) => navigator.open({ screen: "slideshow", slideshowId })}
    updateWaiting={pwaState.updateWaiting}
    onSettings={() => navigator.open({ screen: "settings" })}
    onOpenFile={(file) => void openFlow.open(file, "library")}
    {notice}
    {onDismissNotice}
    onReload={services.reload}
    {statusBar}
    serverOn={serverState.kind === "on"}
    onSetUpFrame={() => navigator.open({ screen: "frameSetup" })}
    onHideFrameCard={actions.hideFrameCard}
    {frameCardShown}
    {demoSlideshow}
    publicInstall={services.demoSlideshow.config.publicInstall}
  />
  <FrameRoutes {route} {services} {navigator} />
  {#if route.screen === "settings"}
    <SettingsSheet
      state={settingsState}
      immich={immichState}
      build={services.build}
      updateWaiting={pwaState.updateWaiting}
      onUpdate={() => pwa.reload()}
      onCheckImmich={() => immich.availability.check().catch(reportError)}
      onReload={services.reload}
      onTheme={(theme) => settings.setTheme(theme)}
      onLanguage={(language) => settings.setLanguage(language)}
      serverOn={serverState.kind === "on"}
      screenShortEdge={services.screenShortEdge()}
      onPlaybackQuality={(quality) => settings.setPlaybackQuality(quality)}
      {frameCardShown}
      onSetUpFrame={() => navigator.open({ screen: "frameSetup" })}
      onFrameCardShown={(shown) => services.frameCardPreference.setShown(shown)}
      onClose={() => navigator.back()}
    />
  {/if}
{:else if route.screen === "frameSetup"}
  <FrameRoutes {route} {services} {navigator} />
{/if}
