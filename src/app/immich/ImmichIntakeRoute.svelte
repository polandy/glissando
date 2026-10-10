<script lang="ts">
  import type { ImmichAlbum } from "../../immich/immich-client";
  import type { PictureIntake } from "../import/picture-intake";
  import type { ImmichBrowser } from "./immich-browser";
  import { alreadyInAmong } from "./immich-view";
  import ImmichRoute from "./ImmichRoute.svelte";

  /**
   * The Immich browser feeding a picture intake: what the intake already has (the slideshow's
   * pictures, those taken in) shows as already in; Add hands the picks to the intake.
   */
  let {
    intake,
    browser,
    parentCrumbs,
    albumId,
    thumbnailUrl,
    onBack,
    onOpenAlbum,
    onAdded,
    onError,
    onReload,
  }: {
    intake: PictureIntake;
    browser: ImmichBrowser;
    parentCrumbs: readonly string[];
    albumId: string | null;
    thumbnailUrl: (photoId: string) => string;
    onBack: () => void;
    onOpenAlbum: (album: ImmichAlbum) => void;
    /** The picks went to the intake: back to its screen. */
    onAdded: () => void;
    onError: (error: unknown) => void;
    onReload: () => void;
  } = $props();

  // The intake is fixed for the route's lifetime.
  // svelte-ignore state_referenced_locally
  let takenIn = $state.raw(intake.pictures.state.pictures);
  $effect(() => intake.pictures.subscribe((next) => (takenIn = next.pictures)));

  const alreadyIn = $derived(alreadyInAmong([...intake.known, ...takenIn]));
</script>

<ImmichRoute
  {browser}
  {parentCrumbs}
  {alreadyIn}
  {albumId}
  {thumbnailUrl}
  {onBack}
  {onOpenAlbum}
  onAdd={(photos) => {
    intake.addImmichPhotos(photos);
    onAdded();
  }}
  {onError}
  {onReload}
/>
