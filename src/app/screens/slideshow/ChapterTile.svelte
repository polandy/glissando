<script lang="ts">
  import type { SlideshowChapter } from "../../../compose/chapters-of-slideshow";
  import { getTranslator } from "../../i18n/context";

  /**
   * A trip chapter's strip tile (TRIP_CHAPTERS.md): a slim chip before its anchor picture, title
   * over subtitle like a picture tile's one grid cell; a full-row bar with both side by side on
   * the phone (PictureStrip.svelte's narrow grid, `@container (max-width: 720px)`). Deliberately
   * without the `.pick` class or `data-picture-id` (PictureStrip.svelte's `hitTest`/`pointerDown`
   * gate drag, select and reorder on those), so it takes no part in them.
   */
  let { chapter, onOpen }: { chapter: SlideshowChapter; onOpen: () => void } = $props();

  const { t } = getTranslator();
  const edited = $derived(chapter.titleEdited || chapter.subtitleEdited);
</script>

<li class="tile">
  <button class="chip" type="button" onclick={onOpen}>
    <span class="line">
      {#if edited}<span class="dot" aria-hidden="true"></span><span class="sr-only"
          >{t("chapters.edited")}</span
        >{/if}
      <span class="title">{chapter.title}</span>
    </span>
    <span class="subtitle">{chapter.subtitle}</span>
  </button>
</li>

<style>
  .tile {
    align-self: center;
  }
  .chip {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 7px 10px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-small);
    background: none;
    color: var(--gl-muted);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: 6px;
    max-width: 100%;
  }
  .chip:hover {
    background: var(--gl-hover);
  }
  .chip:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .title {
    overflow: hidden;
    font-weight: var(--gl-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle {
    overflow: hidden;
    max-width: 100%;
    font-size: var(--gl-size-meta);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gl-accent);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @container (max-width: 720px) {
    .tile {
      grid-column: 1 / -1;
      align-self: auto;
    }
    .chip {
      flex-direction: row;
      align-items: baseline;
      gap: 10px;
    }
    .line {
      flex: none;
    }
    .subtitle {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
</style>
