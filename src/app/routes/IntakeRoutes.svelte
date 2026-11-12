<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { ImmichPhoto } from "../../immich/immich-client";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
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
    onCopyAndAdd,
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
    /** Copies a server slideshow to this device and adds the files to the copy. */
    onCopyAndAdd: (serverSlideshow: StoredSlideshow, files: readonly File[]) => void;
  } = $props();

  const { t } = getTranslator();
  // svelte-ignore state_referenced_locally
  const { store, serverLibrary, navigator, immich, reportError, reload } = services;

  function copyAndAdd(serverSlideshow: StoredSlideshow, files: readonly File[]): void {
    void addFlow.discard(true);
    onCopyAndAdd(serverSlideshow, files);
  }

  const adding = $derived(
    route.slideshowId !== null && addSession?.slideshowId === route.slideshowId ? addSession : null,
  );
  /** What the Immich browser feeds: a new slideshow's pictures, or those added to one. */
  const feed = $derived(
    route.slideshowId === null
      ? importSession && {
          intake: importSession.intake,
          addPhotos: (photos: readonly ImmichPhoto[]) => importSession.addImmichPhotos(photos),
          crumbs: [
            t("start.library"),
            { label: t("import.crumb"), isScreen: false as const },
            t("import.crumbPictures"),
          ],
          withVideos: importSession.choices.current().home === "device",
        }
      : adding && {
          intake: adding.intake,
          addPhotos: (photos: readonly ImmichPhoto[]) => adding.addImmichPhotos(photos),
          crumbs: [t("start.library"), adding.slideshow.title, t("add.title")],
          withVideos: adding.home === "device",
        },
  );
</script>

{#if route.screen === "add" && adding !== null}
  {@const slideshowId = route.slideshowId}
  <AddPicturesRoute
    session={adding}
    loadThumbnail={(id) =>
      (adding.home === "server" ? serverLibrary.store : store).thumbnailBlob(id)}
    loadPicture={(id) =>
      (adding.home === "server" ? serverLibrary.store : store).playbackPictureBlob(id)}
    onError={reportError}
    guardLeave={(guard) => navigator.guardLeave(guard)}
    onDiscard={(leave) => void addFlow.discard(leave)}
    onCommit={() => addFlow.commit()}
    onCopyAndAdd={(files) => copyAndAdd(adding.slideshow, files)}
    immich={immichState}
    onOpenImmich={() => navigator.open({ screen: "immich", opened: null, slideshowId })}
    onImmichSettings={() => navigator.open({ screen: "settings" })}
  />
{:else if route.screen === "immich" && feed !== null}
  {@const { opened, slideshowId } = route}
  {#key feed.intake}
    <ImmichIntakeRoute
      intake={feed.intake}
      addPhotos={feed.addPhotos}
      browser={immichBrowsers.for(feed.intake, feed.withVideos)}
      parentCrumbs={feed.crumbs}
      {opened}
      missingPermissions={immichState.kind === "available" ? immichState.missingPermissions : []}
      thumbnailUrl={(photoId) => immich.client.thumbnailUrl(photoId)}
      faceUrl={(personId) => immich.client.personThumbnailUrl(personId)}
      onBack={() => navigator.back()}
      onOpenAlbum={(album) =>
        navigator.open({ screen: "immich", opened: { kind: "album", id: album.id }, slideshowId })}
      onOpenPerson={(person) =>
        navigator.open({
          screen: "immich",
          opened: { kind: "person", id: person.id },
          slideshowId,
        })}
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
