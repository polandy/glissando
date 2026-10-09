<script lang="ts">
  import type { Snippet } from "svelte";
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import type { PictureEditorView } from "./picture-editor-view";
  import CaptionField from "./CaptionField.svelte";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";

  /**
   * Beside the picture (below it on a phone): the preview, staying in view while the panel
   * scrolls; which frame is edited and the motion's actions; the caption; then the timing.
   */
  let {
    picture,
    motion,
    active,
    preview,
    timing,
    onActivate,
    onSwap,
    onReset,
    caption = $bindable(),
    onCaption,
  }: {
    picture: PictureEditorView;
    motion: OwnKenBurns;
    active: FrameKey;
    preview: Snippet;
    /** The duration and transition sections. */
    timing: Snippet;
    onActivate: (key: FrameKey) => void;
    onSwap: () => void;
    onReset: () => void;
    /** The caption as typed. */
    caption: string;
    onCaption: (typed: string) => void;
  } = $props();

  const { t, formatDate, formatZoom } = getTranslator();
  const KEY_LABELS = { from: "editor.start", to: "editor.end" } as const;
</script>

<aside class="panel">
  <div class="preview-block">{@render preview()}</div>
  <div class="who">
    <b>{t("editor.position", { number: picture.number, count: picture.count })}</b>
    <span class="muted mono">{picture.fileName} · {formatDate(picture.capturedAt)}</span>
  </div>
  <section class="motion" aria-label={t("editor.kenBurns")}>
    <SectionHead
      id="motion-label"
      title={t("editor.kenBurns")}
      stateText={picture.ownMotion ? t("editor.own") : t("editor.automatic")}
      own={picture.ownMotion}
    />
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
    <div class="actions">
      <button class="btn small" type="button" onclick={onSwap}>
        <Icon name="swap" />{t("editor.swap")}
      </button>
      <ResetButton
        automatic={!picture.ownMotion}
        alreadyAutomatic={t("editor.alreadyAutomatic")}
        {onReset}
      />
    </div>
  </section>
  <CaptionField pictureId={picture.id} bind:value={caption} onInput={onCaption} />
  {@render timing()}
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
  /* Stays in view while the panel (or, on a phone, the page) scrolls under it. */
  .preview-block {
    position: sticky;
    top: -20px;
    z-index: 2;
    display: grid;
    gap: 8px;
    margin: -20px -20px 0;
    padding: 20px 20px 12px;
    border-bottom: 1px solid var(--gl-line);
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
    .preview-block {
      top: 0;
      margin: -16px -16px 0;
      padding: 12px 16px 10px;
    }
    .narrow-hint {
      display: block;
    }
  }
</style>
