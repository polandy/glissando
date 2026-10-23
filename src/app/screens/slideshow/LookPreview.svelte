<script lang="ts">
  import { captionStyles, type Size } from "../../../player";
  import { getTranslator } from "../../i18n/context";

  /**
   * One picture of the slideshow, large, graded with the look under preview; its caption, if
   * any, is shown ungraded over it, as the player draws it. A "Hold to compare" button shows the
   * original while pressed; left out while the look is None, which has nothing to compare.
   */
  let {
    pictureUrl,
    caption,
    filterUrl,
    showCompare,
  }: {
    pictureUrl: string;
    /** Normalised; absent shows none. */
    caption: string | undefined;
    /** The look under preview, as a CSS `filter` value; "" for None. */
    filterUrl: string;
    showCompare: boolean;
  } = $props();

  /** A sheet's preview keeps the player's proportions, readable down to this size. */
  const PREVIEW_CAPTION_MIN_FONT_SIZE_PX = 10;

  const { t } = getTranslator();

  let width = $state(0);
  let height = $state(0);
  const viewport: Size = $derived({ width, height });
  const captionLook = $derived(captionStyles(viewport, 0, PREVIEW_CAPTION_MIN_FONT_SIZE_PX));

  let comparing = $state(false);

  function styled(declarations: Readonly<Record<string, string>>) {
    return (element: HTMLElement) => {
      Object.assign(element.style, declarations);
    };
  }

  function holdKeydown(event: KeyboardEvent): void {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      comparing = true;
    }
  }

  function holdKeyup(event: KeyboardEvent): void {
    if (event.key === " " || event.key === "Enter") {
      comparing = false;
    }
  }
</script>

<div class="preview" bind:clientWidth={width} bind:clientHeight={height}>
  <img src={pictureUrl} alt="" style:filter={comparing ? "" : filterUrl} />
  {#if caption !== undefined && height > 0}
    <div data-caption {@attach styled(captionLook.band)}>
      <span {@attach styled(captionLook.text)}>{caption}</span>
    </div>
  {/if}
  {#if showCompare}
    <button
      class="hold"
      type="button"
      onpointerdown={() => (comparing = true)}
      onpointerup={() => (comparing = false)}
      onpointerleave={() => (comparing = false)}
      onpointercancel={() => (comparing = false)}
      onkeydown={holdKeydown}
      onkeyup={holdKeyup}
    >
      {comparing ? t("look.original") : t("look.holdToCompare")}
    </button>
  {/if}
</div>

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-player-bg);
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hold {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 5px 10px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font: inherit;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
</style>
