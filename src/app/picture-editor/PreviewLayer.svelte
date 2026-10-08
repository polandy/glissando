<script lang="ts">
  import { captionStyles, cropRect, layerTransform, type Framing, type Size } from "../../player";
  import type { LayerStyle } from "./timing/transition-styles";

  /**
   * One picture of the preview as the player shows it: the same crop (`cropRect`) and the DOM
   * renderer's transform (`layerTransform`), and the caption as the player lays it over the
   * screen. The layer itself carries a transition's styles, so the caption moves with it.
   */
  let {
    size,
    url,
    framing,
    caption,
    viewport,
    look,
  }: {
    size: Size;
    url: string | null;
    framing: Framing;
    /** Normalised; absent shows none. */
    caption: string | undefined;
    viewport: Size;
    look: LayerStyle;
  } = $props();

  /** A small screen's caption keeps the player's proportions, readable down to this size. */
  const PREVIEW_CAPTION_MIN_FONT_SIZE_PX = 10;

  const transform = $derived(
    viewport.width === 0 || viewport.height === 0
      ? ""
      : layerTransform(cropRect(framing, size, viewport), size, viewport),
  );
  const captionLook = $derived(captionStyles(viewport, 0, PREVIEW_CAPTION_MIN_FONT_SIZE_PX));

  /** Applies `declarations` to the element's inline style, again whenever they change. */
  function styled(declarations: Readonly<Record<string, string>>) {
    return (element: HTMLElement) => {
      Object.assign(element.style, declarations);
    };
  }
</script>

<div class="layer" {@attach styled({ ...look })}>
  {#if url !== null}
    <img
      src={url}
      alt=""
      style:width="{size.width}px"
      style:height="{size.height}px"
      style:transform
    />
  {/if}
  {#if caption !== undefined && viewport.height > 0}
    <div data-caption {@attach styled(captionLook.band)}>
      <span {@attach styled(captionLook.text)}>{caption}</span>
    </div>
  {/if}
</div>

<style>
  .layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  img {
    position: absolute;
    left: 0;
    top: 0;
    max-width: none;
    transform-origin: 0 0;
  }
</style>
