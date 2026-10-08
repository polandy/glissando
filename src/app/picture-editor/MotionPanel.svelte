<script lang="ts">
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { Framing } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import type { MotionPreviewState } from "./motion-preview";
  import type { PictureEditorView } from "./picture-editor-view";
  import MotionPreviewScreen from "./MotionPreviewScreen.svelte";

  /** Beside the picture (below it on a phone): which frame is edited, the preview, the actions. */
  let {
    picture,
    pictureUrl,
    motion,
    active,
    previewState,
    previewFraming,
    onActivate,
    onPlay,
    onPause,
    onSwap,
    onReset,
  }: {
    picture: PictureEditorView;
    pictureUrl: string | null;
    motion: OwnKenBurns;
    active: FrameKey;
    previewState: MotionPreviewState;
    previewFraming: Framing;
    onActivate: (key: FrameKey) => void;
    onPlay: () => void;
    onPause: () => void;
    onSwap: () => void;
    onReset: () => void;
  } = $props();

  const { t, formatDate, formatZoom } = getTranslator();
  const KEY_LABELS = { from: "editor.start", to: "editor.end" } as const;
</script>

<aside class="panel">
  <div class="who">
    <b>{t("editor.position", { number: picture.number, count: picture.count })}</b>
    <span class="muted mono">{picture.fileName} · {formatDate(picture.capturedAt)}</span>
  </div>
  <section class="motion" aria-label={t("editor.kenBurns")}>
    <div class="row">
      <h2 class="eyebrow">{t("editor.kenBurns")}</h2>
      <span class="state" class:own={picture.ownMotion}>
        {picture.ownMotion ? t("editor.own") : t("editor.automatic")}
      </span>
    </div>
    <div class="keys" role="group" aria-label={t("editor.frames")}>
      {#each FRAME_KEYS as key (key)}
        <button
          type="button"
          aria-pressed={key === active}
          data-key={key}
          onclick={() => onActivate(key)}
        >
          <b><i class="swatch"></i>{t(KEY_LABELS[key])}</b>
          <span class="mono">{t("editor.zoom", { zoom: formatZoom(motion[key].zoom) })}</span>
        </button>
      {/each}
    </div>
    <p class="narrow-hint muted">{t("editor.hintNarrow")}</p>
    <MotionPreviewScreen
      size={picture.size}
      {pictureUrl}
      framing={previewFraming}
      playback={previewState}
      durationMs={picture.durationMs}
      {onPlay}
      {onPause}
    />
    <div class="actions">
      <button class="btn small" type="button" onclick={onSwap}>
        <Icon name="swap" />{t("editor.swap")}
      </button>
      <button
        class="btn small ghost"
        type="button"
        aria-disabled={!picture.ownMotion}
        title={picture.ownMotion ? undefined : t("editor.alreadyAutomatic")}
        onclick={onReset}
      >
        <Icon name="replay" />{t("editor.reset")}
      </button>
    </div>
  </section>
</aside>

<style>
  .panel {
    display: grid;
    align-content: start;
    gap: 18px;
    min-height: 0;
    padding: 20px;
    overflow: auto;
    border-left: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .who {
    display: grid;
    gap: 3px;
  }
  .who b {
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
  }
  .who span {
    font-size: var(--gl-size-meta);
  }
  .motion {
    display: grid;
    gap: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .row h2 {
    margin: 0;
  }
  .state {
    padding: 3px 9px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
  .state.own {
    border-color: transparent;
    background: color-mix(in srgb, var(--gl-accent) 28%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .keys {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .keys button {
    display: grid;
    gap: 1px;
    padding: 7px 10px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .keys button[aria-pressed="true"] {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .keys b {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--gl-size-label);
  }
  .keys span {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  /* The frame's own border style: dashed while inactive, solid while edited. */
  .swatch {
    width: 12px;
    height: 8px;
    border: 1.5px dashed var(--gl-muted);
    border-radius: 2px;
  }
  [aria-pressed="true"] .swatch {
    border-style: solid;
    border-color: var(--gl-ink);
  }
  .narrow-hint {
    display: none;
    margin: 0;
    font-size: var(--gl-size-meta);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  @container (max-width: 720px) {
    .panel {
      padding: 16px;
      overflow: visible;
      border-left: 0;
    }
    .narrow-hint {
      display: block;
    }
  }
</style>
