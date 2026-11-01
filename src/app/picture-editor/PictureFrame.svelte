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
    --active-border: 2px;
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
    border: var(--active-border) solid var(--gl-on-photo);
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
  /* Above the handles, so the chip's touch pad is its own; inside the picture, so nothing clips it. */
  @media (pointer: coarse) {
    .chip {
      z-index: 1;
    }
    .chip::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: max(100%, var(--gl-hit-min));
      height: max(100%, var(--gl-hit-min));
      transform: translate(-50%, -50%);
    }
    [data-key="from"] .chip {
      top: calc(var(--gl-hit-min) / 3);
    }
    /* Clear of the other frame's corner handle, whose hit area reaches this far in. */
    [data-key="to"] .chip {
      right: calc((var(--handle-hit) + var(--handle)) / 2);
      bottom: calc(var(--gl-hit-min) / 3);
    }
  }
  /* Centred on the active border's corner. */
  .handle {
    --offset: calc(var(--handle) / -2 - var(--active-border) / 2);
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
