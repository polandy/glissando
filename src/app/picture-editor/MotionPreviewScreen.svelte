<script lang="ts">
  import {
    captionStyles,
    cropRect,
    layerTransform,
    MILLISECONDS_PER_SECOND,
    type Framing,
    type Size,
  } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MotionPreviewState } from "./motion-preview";

  /**
   * A 16:9 screen showing the motion as the player shows it: the same crop (`cropRect`) and the
   * DOM renderer's transform (`layerTransform`), over the picture at its stored size; and the
   * caption as the player lays it over that screen.
   */
  let {
    size,
    pictureUrl,
    framing,
    playback,
    durationMs,
    caption,
    onPlay,
    onPause,
  }: {
    size: Size;
    pictureUrl: string | null;
    framing: Framing;
    playback: MotionPreviewState;
    durationMs: number;
    /** Normalised; absent shows none. */
    caption: string | undefined;
    onPlay: () => void;
    onPause: () => void;
  } = $props();

  const { t, formatTenths } = getTranslator();

  let width = $state(0);
  let height = $state(0);
  const transform = $derived.by(() => {
    if (width === 0 || height === 0) {
      return "";
    }
    const viewport = { width, height };
    return layerTransform(cropRect(framing, size, viewport), size, viewport);
  });
  const totalSeconds = $derived(durationMs / MILLISECONDS_PER_SECOND);
  /** A small screen's caption keeps the player's proportions, readable down to this size. */
  const PREVIEW_CAPTION_MIN_FONT_SIZE_PX = 10;
  const captionLook = $derived(
    captionStyles({ width, height }, 0, PREVIEW_CAPTION_MIN_FONT_SIZE_PX),
  );

  /** Applies `declarations` to the element's inline style, again whenever they change. */
  function styled(declarations: Readonly<Record<string, string>>) {
    return (element: HTMLElement) => {
      Object.assign(element.style, declarations);
    };
  }
</script>

<div class="preview" bind:clientWidth={width} bind:clientHeight={height}>
  {#if pictureUrl !== null}
    <img
      src={pictureUrl}
      alt=""
      style:width="{size.width}px"
      style:height="{size.height}px"
      style:transform
    />
  {/if}
  {#if caption !== undefined && height > 0}
    <div data-caption {@attach styled(captionLook.band)}>
      <span {@attach styled(captionLook.text)}>{caption}</span>
    </div>
  {/if}
</div>
<div class="controls">
  <button
    class="round"
    type="button"
    aria-label={playback.playing ? t("editor.pausePreview") : t("editor.playPreview")}
    onclick={playback.playing ? onPause : onPlay}
  >
    <Icon name={playback.playing ? "pause" : "play"} />
  </button>
  <div class="track" aria-hidden="true">
    <i style:width="{playback.progress * 100}%"></i>
  </div>
  <span class="preview-time mono">
    {t("editor.previewTime", {
      current: formatTenths(playback.progress * totalSeconds),
      total: formatTenths(totalSeconds),
    })}
  </span>
</div>

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-player-bg);
  }
  .preview img {
    position: absolute;
    left: 0;
    top: 0;
    max-width: none;
    transform-origin: 0 0;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .round {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
    cursor: pointer;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .track {
    flex: 1;
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--gl-hover);
  }
  .track i {
    display: block;
    height: 100%;
    background: var(--gl-accent);
  }
  .preview-time {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
</style>
