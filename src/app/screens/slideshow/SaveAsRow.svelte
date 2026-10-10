<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** "Save as": video and web page side by side (VIDEO_EXPORT.md and HTML_EXPORT.md, Sheet). */
  let { onSaveVideo, onSaveWebPage }: { onSaveVideo: () => void; onSaveWebPage: () => void } =
    $props();

  const { t } = getTranslator();
  let videoButton: HTMLButtonElement;
  let webPageButton: HTMLButtonElement;

  export function focusVideo(): void {
    videoButton.focus();
  }

  export function focusWebPage(): void {
    webPageButton.focus();
  }
</script>

<div class="save-as" role="group" aria-labelledby="save-as-label">
  <span id="save-as-label" class="label">{t("slideshow.saveAs")}</span>
  <div class="pair">
    <!-- The full name says what the short label means outside the row. -->
    <button
      bind:this={videoButton}
      class="btn"
      type="button"
      aria-label={t("slideshow.saveAsVideo")}
      onclick={onSaveVideo}
    >
      <Icon name="film" />{t("slideshow.saveVideo")}
    </button>
    <button
      bind:this={webPageButton}
      class="btn"
      type="button"
      aria-label={t("slideshow.saveAsWebPage")}
      onclick={onSaveWebPage}
    >
      <Icon name="page" />{t("slideshow.saveWebPage")}
    </button>
  </div>
</div>

<style>
  .save-as {
    display: grid;
    gap: 6px;
  }
  .label {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
</style>
