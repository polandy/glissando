<script lang="ts">
  import { onDestroy } from "svelte";
  import { composeSlideshow } from "../../compose";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import { browserObjectUrls } from "../media/object-urls";
  import { openPlayerMedia, type PlayerMedia } from "../media/player-media";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";

  /** The player over its slideshow; the media's object URLs live exactly as long as it does. */
  let {
    stored,
    media,
    onClose,
  }: { stored: StoredSlideshow; media: PlayerMedia; onClose: () => void } = $props();

  // One opening plays one slideshow; a different one mounts a new layer.
  // svelte-ignore state_referenced_locally
  const opened = openPlayerMedia(media, browserObjectUrls);
  // svelte-ignore state_referenced_locally
  const slideshow = composeSlideshow(stored, opened.sources);
  onDestroy(() => opened.close());
</script>

<PlayerOverlay {slideshow} musicTitle={stored.music?.fileName ?? null} {onClose} />
