<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "./components/Dialog.svelte";
  import Toast from "./components/Toast.svelte";
  import { getTranslator } from "./i18n/context";
  import { ImportFlow } from "./import/import-flow";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import StartRoute from "./routes/StartRoute.svelte";
  import type { AppServices } from "./services";
  import type { SettingsState } from "./settings/app-settings";
  import SettingsSheet from "./settings/SettingsSheet.svelte";
  import type { ToastMessage } from "./toast/toaster";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, settings } = services;
  const { t } = getTranslator();
  // svelte-ignore state_referenced_locally
  const importFlow = new ImportFlow<ImportSession>({
    ...services,
    createdText: () => t("import.created"),
  });

  let route = $state.raw<Route>(navigator.route);
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
      route = next;
    });
    const stopToast = toaster.subscribe((next) => (toast = next));
    const stopSettings = settings.subscribe((next) => (settingsState = next));
    const stopImport = importFlow.subscribe((next) => {
      importSession = next.session;
      persistRefused = next.persistRefused;
    });
    return () => {
      stopRoute();
      stopToast();
      stopSettings();
      stopImport();
    };
  });

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
  />
{:else if route.screen === "slideshow" || route.screen === "player"}
  {@const slideshowId = route.slideshowId}
  {#key slideshowId}
    <SlideshowRoute
      {store}
      {slideshowId}
      playing={route.screen === "player"}
      onBack={() => navigator.back()}
      onPlay={() => navigator.open({ screen: "player", slideshowId })}
      onError={reportError}
    />
  {/key}
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
