<script lang="ts">
  import type { Framing, Size } from "../../player";
  import { getTranslator } from "../i18n/context";
  import { CORNERS, frameStyle } from "./frame-geometry";
  import type { FrameKey } from "./frame-keys";

  /**
   * One of the motion's frames on the picture. The active one is solid with four corner handles
   * and veils the rest of the picture; the other is dashed, and its label chip makes it active.
   */
  let {
    key,
    framing,
    size,
    active,
    onActivate,
    onKeydown,
  }: {
    key: FrameKey;
    framing: Framing;
    size: Size;
    active: boolean;
    onActivate: (key: FrameKey) => void;
    /** Keys on the focused active frame. */
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  const { t, formatZoom } = getTranslator();

  const LABELS = {
    from: { chip: "editor.start", edit: "editor.editStartFrame", frame: "editor.startFrame" },
    to: { chip: "editor.end", edit: "editor.editEndFrame", frame: "editor.endFrame" },
  } as const;
  const labels = $derived(LABELS[key]);
</script>

<!-- A two-dimensional control no ARIA widget role describes; it takes its own keys. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="frame"
  class:active
  data-key={key}
  style={frameStyle(framing, size)}
  role="application"
  aria-label={t(labels.frame, { zoom: formatZoom(framing.zoom) })}
  tabindex={active ? 0 : -1}
  onkeydown={active ? onKeydown : undefined}
>
  <button
    class="chip"
    type="button"
    tabindex="-1"
    aria-label={active ? t(labels.chip) : t(labels.edit)}
    onpointerdown={(event) => {
      if (!active) {
        event.stopPropagation();
        onActivate(key);
      }
    }}
  >
    {t(labels.chip)}
  </button>
  {#if active}
    {#each CORNERS as corner (corner)}
      <span class="handle {corner}" data-corner={corner}></span>
    {/each}
  {/if}
</div>

<style>
  .frame {
    position: absolute;
    z-index: 2;
    box-sizing: border-box;
    border: 1.5px dashed var(--gl-photo-dashed);
    border-radius: 2px;
    pointer-events: none;
    --handle: var(--gl-editor-handle);
    --handle-hit: var(--gl-editor-handle-hit);
  }
  @media (pointer: coarse) {
    .frame {
      --handle: var(--gl-editor-handle-coarse);
      --handle-hit: var(--gl-editor-handle-hit-coarse);
    }
  }
  /* Above the other frame: its handles come first. Only chip and handles take pointers. */
  .frame.active {
    z-index: 3;
    border: 2px solid var(--gl-on-photo);
  }
  .frame:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .chip {
    position: absolute;
    padding: 3px 7px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font: inherit;
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: var(--gl-tracking-eyebrow);
    white-space: nowrap;
    pointer-events: auto;
    cursor: pointer;
  }
  .active .chip {
    background: var(--gl-on-photo);
    color: var(--gl-photo-play-ink);
    cursor: inherit;
  }
  [data-key="from"] .chip {
    left: 4px;
    top: 4px;
  }
  [data-key="to"] .chip {
    right: 4px;
    bottom: 4px;
  }
  /* Centred on the 2 px border's corner. */
  .handle {
    --offset: calc(var(--handle) / -2 - 1px);
    position: absolute;
    width: var(--handle);
    height: var(--handle);
    box-sizing: border-box;
    border: 1.5px solid var(--gl-photo-play-ink);
    border-radius: 3px;
    background: var(--gl-on-photo);
    pointer-events: auto;
  }
  /* A larger hit area than the visible square, for a finger. */
  .handle::before {
    content: "";
    position: absolute;
    inset: calc((var(--handle) - var(--handle-hit)) / 2);
  }
  .nw {
    left: var(--offset);
    top: var(--offset);
    cursor: nwse-resize;
  }
  .se {
    right: var(--offset);
    bottom: var(--offset);
    cursor: nwse-resize;
  }
  .ne {
    right: var(--offset);
    top: var(--offset);
    cursor: nesw-resize;
  }
  .sw {
    left: var(--offset);
    bottom: var(--offset);
    cursor: nesw-resize;
  }
</style>
