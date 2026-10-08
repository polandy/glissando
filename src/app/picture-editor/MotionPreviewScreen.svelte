<script lang="ts">
  import { KEN_BURNS_EASING } from "../../compose";
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import { framingAt, MILLISECONDS_PER_SECOND } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MotionPreviewState } from "./motion-preview";
  import type { PictureEditorView } from "./picture-editor-view";
  import PreviewLayer from "./PreviewLayer.svelte";
  import PreviewLine from "./PreviewLine.svelte";
  import { previewPlan, previewSceneAt, type PreviewScene } from "./timing/preview-timeline";
  import { transitionStyles, type LayerStyle } from "./timing/transition-styles";

  /**
   * A 16:9 screen playing the picture as the player plays it, over its real duration, then its
   * transition into the next picture (or the end of the slideshow); a track marking the
   * transition's zone, the time, and a line naming what plays.
   */
  let {
    picture,
    motion,
    pictureUrl,
    nextPictureUrl,
    caption,
    playback,
    onPlay,
    onPause,
  }: {
    picture: PictureEditorView;
    /** This picture's motion, also while a frame is being dragged. */
    motion: OwnKenBurns;
    pictureUrl: string | null;
    nextPictureUrl: string | null;
    /** This picture's caption, normalised; absent shows none. */
    caption: string | undefined;
    playback: MotionPreviewState;
    onPlay: () => void;
    onPause: () => void;
  } = $props();

  const { t, formatTenths } = getTranslator();
  const PERCENT = 100;
  const SHOWN: LayerStyle = {
    opacity: "1",
    transform: "none",
    clipPath: "none",
    maskImage: "none",
  };

  let width = $state(0);
  let height = $state(0);
  const viewport = $derived({ width, height });
  const plan = $derived(previewPlan(picture));
  const scene: PreviewScene = $derived(
    playback.onFrame
      ? { kind: "picture", progress: Math.min(1, playback.elapsedMs / plan.durationMs) }
      : previewSceneAt(plan, playback.elapsedMs),
  );
  const looks = $derived(
    scene.kind === "transition"
      ? transitionStyles(scene.effect, scene.progress, viewport)
      : { from: SHOWN, to: SHOWN },
  );
  const thisProgress = $derived(
    scene.kind === "picture"
      ? scene.progress
      : scene.kind === "transition"
        ? scene.fromProgress
        : 1,
  );
  const nextProgress = $derived(
    scene.kind === "next" ? scene.progress : scene.kind === "transition" ? scene.toProgress : 0,
  );
  const shownMs = $derived(Math.min(playback.elapsedMs, plan.durationMs));
  const transitionShare = $derived((plan.transition?.durationMs ?? 0) / plan.durationMs);
  const seconds = (ms: number) => formatTenths(ms / MILLISECONDS_PER_SECOND);
</script>

<div class="preview" bind:clientWidth={width} bind:clientHeight={height}>
  {#if scene.kind === "picture" || scene.kind === "transition"}
    <PreviewLayer
      size={picture.size}
      url={pictureUrl}
      framing={framingAt({ ...motion, easing: KEN_BURNS_EASING }, thisProgress)}
      {caption}
      {viewport}
      look={looks.from}
    />
  {/if}
  {#if picture.next !== null && (scene.kind === "transition" || scene.kind === "next")}
    <PreviewLayer
      size={picture.next.size}
      url={nextPictureUrl}
      framing={framingAt({ ...picture.next.motion, easing: KEN_BURNS_EASING }, nextProgress)}
      caption={picture.next.caption === "" ? undefined : picture.next.caption}
      {viewport}
      look={looks.to}
    />
  {/if}
  {#if scene.kind === "end"}
    <div class="end-card">{t("editor.endOfSlideshow")}</div>
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
    {#if transitionShare > 0}
      <span class="transition-zone" style:width="{transitionShare * PERCENT}%"></span>
    {/if}
    <i style:width="{(shownMs / plan.durationMs) * PERCENT}%"></i>
  </div>
  <span class="preview-time mono">
    {t("editor.previewTime", { current: seconds(shownMs), total: seconds(plan.durationMs) })}
  </span>
</div>
<PreviewLine {picture} />

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-player-bg);
  }
  .end-card {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: var(--gl-player-bg);
    color: var(--gl-player-text);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: var(--gl-tracking-eyebrow);
    text-transform: uppercase;
    opacity: 0.7;
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
    position: relative;
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--gl-hover);
  }
  .track i {
    position: relative;
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--gl-accent);
  }
  /* Hatched in the accent: where the transition runs, at the end of the picture. */
  .transition-zone {
    position: absolute;
    top: -3px;
    right: 0;
    bottom: -3px;
    border-radius: 3px;
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--gl-accent) 55%, transparent) 0 3px,
      transparent 3px 6px
    );
  }
  .preview-time {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
</style>
