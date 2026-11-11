<script lang="ts">
  import type {
    ImmichAlbum,
    ImmichPerson,
    ImmichPhoto,
    OptionalImmichPermission,
  } from "../../immich/immich-client";
  import type { OpenedSource } from "../navigation/route";
  import type { Crumb } from "../components/crumbs";
  import type { PictureIntake } from "../import/picture-intake";
  import type { ImmichBrowser } from "./immich-browser";
  import { alreadyInAmong } from "./immich-view";
  import ImmichRoute from "./ImmichRoute.svelte";

  /**
   * The Immich browser feeding a picture intake: what the intake already has (the slideshow's
   * pictures, those taken in) shows as already in; Add hands the picks to `addPhotos`, which
   * downloads or links them into the intake.
   */
  let {
    intake,
    browser,
    parentCrumbs,
    opened,
    missingPermissions,
    thumbnailUrl,
    faceUrl,
    onBack,
    onOpenAlbum,
    onOpenPerson,
    addPhotos,
    onAdded,
    onError,
    onReload,
  }: {
    intake: PictureIntake;
    browser: ImmichBrowser;
    parentCrumbs: readonly Crumb[];
    opened: OpenedSource | null;
    missingPermissions: readonly OptionalImmichPermission[];
    thumbnailUrl: (photoId: string) => string;
    faceUrl: (personId: string) => string;
    onBack: () => void;
    onOpenAlbum: (album: ImmichAlbum) => void;
    onOpenPerson: (person: ImmichPerson) => void;
    addPhotos: (photos: readonly ImmichPhoto[]) => void;
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
  {opened}
  {missingPermissions}
  {thumbnailUrl}
  {faceUrl}
  {onBack}
  {onOpenAlbum}
  {onOpenPerson}
  onAdd={(photos) => {
    addPhotos(photos);
    onAdded();
  }}
  {onError}
  {onReload}
/>
