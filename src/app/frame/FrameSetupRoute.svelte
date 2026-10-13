<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { ImmichAvailability } from "../../immich/immich-availability";
  import type { ImmichClient } from "../../immich/immich-client";
  import { COPIED_FEEDBACK_MS } from "../share-link/share-link-session";
  import type { FrameDevice } from "./browser-frame-device";
  import { FrameAlbums, type FrameAlbumsState } from "./frame-albums";
  import type { FrameIntervalSeconds } from "./frame-preferences";
  import type { FramePreferences, FramePreferencesState } from "./frame-preferences";
  import FrameSetupScreen from "./FrameSetupScreen.svelte";
  import type { FrameOrder } from "../../frame/frame-deck";

  let {
    immich,
    preferences,
    device,
    onBack,
    onStart,
  }: {
    immich: { readonly client: ImmichClient; readonly availability: ImmichAvailability };
    preferences: FramePreferences;
    device: FrameDevice;
    onBack: () => void;
    onStart: (albumId: string) => void;
  } = $props();

  // The album browser is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const albums = new FrameAlbums({
    client: immich.client,
    reportUnavailable: (kind) => immich.availability.report(kind),
  });
  let albumsState = $state.raw<FrameAlbumsState>(albums.state);
  // svelte-ignore state_referenced_locally
  let prefs = $state.raw<FramePreferencesState>(preferences.state);
  // The album chosen here, before "Start frame" commits it; pre-filled from the last frame.
  // svelte-ignore state_referenced_locally
  let selectedAlbumId = $state.raw<string | null>(preferences.state.albumId);
  let linkCopied = $state(false);
  let cancelCopiedFeedback: (() => void) | null = null;

  onMount(() => {
    const stopAlbums = albums.subscribe((next) => (albumsState = next));
    const stopPrefs = preferences.subscribe((next) => (prefs = next));
    albums.load().catch(() => undefined);
    return () => {
      stopAlbums();
      stopPrefs();
    };
  });
  onDestroy(() => cancelCopiedFeedback?.());

  function selectAlbum(albumId: string): void {
    selectedAlbumId = albumId;
  }

  function backToAlbums(): void {
    selectedAlbumId = null;
  }

  function copyLink(): void {
    const albumId = selectedAlbumId;
    if (albumId === null || device.clipboard === null) {
      return;
    }
    device.clipboard
      .writeText(device.linkFor(albumId))
      .then(() => {
        linkCopied = true;
        cancelCopiedFeedback?.();
        cancelCopiedFeedback = device.scheduler.after(COPIED_FEEDBACK_MS, () => {
          linkCopied = false;
        });
      })
      .catch(() => undefined);
  }

  function start(): void {
    const albumId = selectedAlbumId;
    if (albumId === null) {
      return;
    }
    preferences.setAlbum(albumId);
    onStart(albumId);
  }
</script>

<FrameSetupScreen
  albums={albumsState.albums}
  failure={albumsState.failure}
  {selectedAlbumId}
  intervalSeconds={prefs.intervalSeconds}
  order={prefs.order}
  showClock={prefs.showClock}
  showDate={prefs.showDate}
  canCopyLink={device.clipboard !== null}
  {linkCopied}
  thumbnailUrl={(photoId) => immich.client.thumbnailUrl(photoId)}
  {onBack}
  onSelectAlbum={selectAlbum}
  onBackToAlbums={backToAlbums}
  onInterval={(seconds: FrameIntervalSeconds) => preferences.setIntervalSeconds(seconds)}
  onOrder={(order: FrameOrder) => preferences.setOrder(order)}
  onShowClock={(on) => preferences.setShowClock(on)}
  onShowDate={(on) => preferences.setShowDate(on)}
  onCopyLink={copyLink}
  onStart={start}
  onRetry={() => void albums.retry()}
/>
