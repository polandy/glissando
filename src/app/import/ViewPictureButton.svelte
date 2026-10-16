<script lang="ts">
  import type { StoredPicture } from "../../library/stored-slideshow";
  import { getTranslator } from "../i18n/context";

  /** Covers a tile: choosing it shows the picture full screen. The tile's own marks stay above it. */
  let { picture, onView }: { picture: StoredPicture; onView: (pictureId: string) => void } =
    $props();

  const { t, formatDate, formatTime } = getTranslator();
</script>

<button
  class="view"
  type="button"
  data-view-id={picture.id}
  aria-label={t("view.open", {
    date: formatDate(picture.capturedAt),
    time: formatTime(picture.capturedAt),
  })}
  onclick={() => onView(picture.id)}
></button>

<style>
  .view {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
  }
</style>
