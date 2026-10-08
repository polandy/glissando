<script lang="ts">
  import { onMount } from "svelte";
  import type { StoredSlideshow } from "../library/stored-slideshow";
  import Dialog from "./components/Dialog.svelte";
  import Toast from "./components/Toast.svelte";
  import { getTranslator } from "./i18n/context";
  import ImportRoute from "./import/ImportRoute.svelte";
  import type { ImportSession } from "./import/import-session";
  import type { Route } from "./navigation/route";
  import SlideshowRoute from "./routes/SlideshowRoute.svelte";
  import StartRoute from "./routes/StartRoute.svelte";
  import type { AppServices } from "./services";
  import type { ToastMessage } from "./toast/toaster";

  let { services, playStartAnimation }: { services: AppServices; playStartAnimation: boolean } =
    $props();

  // The services are wired once, by the composition root.
  // svelte-ignore state_referenced_locally
  const { store, navigator, toaster, reportError, persistencePrompt } = services;
  const { t } = getTranslator();

  let route = $state.raw<Route>(navigator.route);
  let toast = $state.raw<ToastMessage | null>(toaster.current);
  let importSession = $state.raw<ImportSession | null>(null);
  let persistRefused = $state(false);
  // The logo animates on the first launch only, not on every return to the start screen.
  // svelte-ignore state_referenced_locally
  let logoPlays = $state(playStartAnimation);

  onMount(() => {
    const stopRoute = navigator.subscribe((next) => {
      if (next.screen !== "start") {
        logoPlays = false;
      }
      if (next.screen === "import") {
        importSession ??= services.newImportSession();
      }
      route = next;
    });
    const stopToast = toaster.subscribe((next) => (toast = next));
    return () => {
      stopRoute();
      stopToast();
    };
  });

  function openImport(): void {
    importSession ??= services.newImportSession();
    navigator.open({ screen: "import", step: "pictures" });
  }

  function discardImport(leave: boolean): void {
    importSession?.discard();
    services.endImport();
    if (leave) {
      importSession = null;
      navigator.back();
    }
  }

  function created(slideshow: StoredSlideshow): void {
    importSession = null;
    services.endImport();
    navigator.open({ screen: "slideshow", slideshowId: slideshow.id });
    toaster.show({ text: t("import.created"), tone: "info" });
    persistencePrompt.afterCreate().then((refused) => (persistRefused = refused), reportError);
  }

  function musicUnreadable(retry: () => void): void {
    toaster.show({
      text: t("import.musicUnreadable"),
      tone: "error",
      action: { label: t("common.retry"), run: retry },
    });
  }
</script>

{#if route.screen === "start"}
  <StartRoute
    {store}
    playStartAnimation={logoPlays}
    onError={reportError}
    onCreate={openImport}
    onOpen={(slideshowId) => navigator.open({ screen: "slideshow", slideshowId })}
  />
{:else if route.screen === "import" && importSession !== null}
  <ImportRoute
    step={route.step}
    session={importSession}
    loadThumbnail={(id) => store.thumbnailBlob(id)}
    onError={reportError}
    onMusicUnreadable={musicUnreadable}
    onToMusic={() => navigator.open({ screen: "import", step: "music" })}
    onBack={() => navigator.back()}
    onDiscard={discardImport}
    onCreated={created}
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
      { label: t("common.understood"), tone: "mint", onSelect: () => (persistRefused = false) },
    ]}
  />
{/if}
