<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { ImmichPhoto } from "../../immich/immich-client";
  import type { AddPicturesFlow } from "../add-pictures/add-pictures-flow";
  import type { AddPicturesSession } from "../add-pictures/add-pictures-session";
  import AddPicturesRoute from "../add-pictures/AddPicturesRoute.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ImmichBrowsers } from "../immich/immich-browsers";
  import ImmichIntakeRoute from "../immich/ImmichIntakeRoute.svelte";
  import type { ImportSession } from "../import/import-session";
  import type { Route } from "../navigation/route";
  import type { AppServices } from "../services";

  /**
   * The add screen and the Immich browser, which feeds the intake of whichever screen opened it:
   * the import's pictures step (no slideshow id) or the add screen of that slideshow.
   */
  let {
    route,
    importSession,
    addSession,
    addFlow,
    immichBrowsers,
    services,
    immichState,
  }: {
    route: Extract<Route, { screen: "add" | "immich" }>;
    importSession: ImportSession | null;
    addSession: AddPicturesSession | null;
    addFlow: AddPicturesFlow<AddPicturesSession>;
    immichBrowsers: ImmichBrowsers;
    services: Pick<
      AppServices,
      "store" | "serverLibrary" | "navigator" | "immich" | "reportError" | "reload"
    >;
    immichState: ImmichAvailabilityState;
  } = $props();

  const { t } = getTranslator();
  // svelte-ignore state_referenced_locally
  const { store, serverLibrary, navigator, immich, reportError, reload } = services;

  const adding = $derived(
    route.slideshowId !== null && addSession?.slideshowId === route.slideshowId ? addSession : null,
  );
  /** What the Immich browser feeds: a new slideshow's pictures, or those added to one. */
  const feed = $derived(
    route.slideshowId === null
      ? importSession && {
          intake: importSession.intake,
          addPhotos: (photos: readonly ImmichPhoto[]) => importSession.addImmichPhotos(photos),
          crumbs: [t("import.crumb"), t("import.crumbPictures")],
        }
      : adding && {
          intake: adding.intake,
          addPhotos: (photos: readonly ImmichPhoto[]) => adding.addImmichPhotos(photos),
          crumbs: [adding.slideshow.title, t("add.title")],
        },
  );
</script>

{#if route.screen === "add" && adding !== null}
  {@const slideshowId = route.slideshowId}
  <AddPicturesRoute
    session={adding}
    loadThumbnail={(id) =>
      (adding.home === "server" ? serverLibrary.store : store).thumbnailBlob(id)}
    onError={reportError}
    onDiscard={(leave) => void addFlow.discard(leave)}
    onCommit={() => addFlow.commit()}
    immich={immichState}
    onOpenImmich={() => navigator.open({ screen: "immich", albumId: null, slideshowId })}
    onImmichSettings={() => navigator.open({ screen: "settings" })}
  />
{:else if route.screen === "immich" && feed !== null}
  {@const { albumId, slideshowId } = route}
  {#key feed.intake}
    <ImmichIntakeRoute
      intake={feed.intake}
      addPhotos={feed.addPhotos}
      browser={immichBrowsers.for(feed.intake)}
      parentCrumbs={feed.crumbs}
      {albumId}
      thumbnailUrl={(photoId) => immich.client.thumbnailUrl(photoId)}
      onBack={() => navigator.back()}
      onOpenAlbum={(album) => navigator.open({ screen: "immich", albumId: album.id, slideshowId })}
      onAdded={() =>
        navigator.open(
          slideshowId === null
            ? { screen: "import", step: "pictures" }
            : { screen: "add", slideshowId },
        )}
      onError={reportError}
      onReload={reload}
    />
  {/key}
{/if}
