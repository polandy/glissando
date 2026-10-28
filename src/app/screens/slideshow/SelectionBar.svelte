<script lang="ts">
  import { orderWithGroupShifted } from "../../../library/group-order";
  import Icon from "../../components/Icon.svelte";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";
  import { isContiguous, selectedInOrder, type StripSelection } from "./strip-selection";

  /**
   * What the selection offers, fixed to the bottom of the viewport (dev-docs/app/slideshow-editing/:
   * REMOVE_SELECT_REORDER.md, Select and reorder; SELECTING_SEVERAL.md, Selecting several). Its height
   * and inset come from the screen, which keeps that much room below its content.
   */
  let {
    selection,
    order,
    onShiftGroup,
    onRemoveGroup,
    onEdit,
    onView,
    onDone,
    arranging = true,
    viewMode = false,
    onInsertChapter,
  }: {
    selection: StripSelection;
    /** The slideshow's current play order, for the group moves and the contiguous range. */
    order: readonly string[];
    /** Earlier/Later: moves the selection by `offset` steps (ADR-0019). Unused while `!arranging`. */
    onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
    onRemoveGroup: (pictureIds: readonly string[]) => void;
    /** Opens the picture editor, or the viewer while `viewMode`; one picture selected, only. */
    onEdit: (pictureId: string) => void;
    /** Opens the picture full screen beside Edit (PICTURE_VIEWER.md); undefined while `viewMode`. */
    onView?: (pictureId: string) => void;
    onDone: () => void;
    /** False hides Earlier/Later (IMPORT_ARRANGING.md, Add media): no moving while adding. */
    arranging?: boolean;
    /** True shows View (full-screen) instead of Edit: no picture editor while importing. */
    viewMode?: boolean;
    /** Inserts a trip chapter before the selected picture (TRIP_CHAPTERS.md); omitted while importing. */
    onInsertChapter?: (pictureId: string) => void;
  } = $props();

  const { t } = getTranslator();
  const selectedIds = $derived(selectedInOrder(selection, order));
  const count = $derived(selectedIds.length);
  const soleId = $derived(selectedIds[0] ?? null);
  const soleIndex = $derived(soleId === null ? -1 : order.indexOf(soleId));
  const range = $derived(
    count > 0 && isContiguous(selection.ids, order)
      ? {
          from: order.indexOf(selectedIds[0] as string) + 1,
          to: order.indexOf(selectedIds.at(-1) as string) + 1,
        }
      : null,
  );
  // Disabled exactly when moving that way would change nothing (`orderWithGroupShifted` says so
  // by returning the same order): one block already at that end, or nothing selected.
  const earlierDisabled = $derived(
    count === 0 || orderWithGroupShifted(order, selection.ids, -1) === order,
  );
  const laterDisabled = $derived(
    count === 0 || orderWithGroupShifted(order, selection.ids, 1) === order,
  );
  // Selecting several: disabled-looking with nothing selected. A single selection instead looks
  // disabled for the last picture, which stays; Remove still answers that, with its own toast.
  const removeDisabledLook = $derived(selection.several ? count === 0 : order.length < 2);

  function earlier(): void {
    if (!earlierDisabled) {
      onShiftGroup(selectedIds, -1);
    }
  }

  function later(): void {
    if (!laterDisabled) {
      onShiftGroup(selectedIds, 1);
    }
  }

  function edit(): void {
    if (soleId !== null) {
      onEdit(soleId);
    }
  }

  function view(): void {
    if (soleId !== null && onView !== undefined) {
      onView(soleId);
    }
  }

  function remove(): void {
    if (count > 0) {
      onRemoveGroup(selectedIds);
    }
  }

  function insertChapter(): void {
    if (soleId !== null) {
      onInsertChapter?.(soleId);
    }
  }
</script>

<div class="dock" use:keepToastsClear>
  <div class="bar" role="toolbar" aria-label={t("slideshow.selection")}>
    <!-- Announced on every move; on a narrow screen hidden from sight, not from screen readers. -->
    {#if selection.several}
      <span class="count several" aria-live="polite">
        <b class="mono">{count}</b><span class="word"
          >{range === null
            ? t("slideshow.selectedCount", { count })
            : t("slideshow.selectedRange", {
                count,
                from: range.from,
                to: range.to,
                total: order.length,
              })}</span
        >
      </span>
    {:else}
      <span class="count" aria-live="polite">
        {t("slideshow.selectionCount", { number: soleIndex + 1, total: order.length })}
      </span>
    {/if}
    <span class="separator" aria-hidden="true"></span>
    {#if arranging}
      <!-- At the ends Earlier and Later look off but keep their place in the tab order. -->
      <button class="btn icon-btn" type="button" aria-disabled={earlierDisabled} onclick={earlier}>
        <Icon name="chevronLeft" /><span class="move-word">{t("slideshow.earlier")}</span>
      </button>
      <button class="btn icon-btn" type="button" aria-disabled={laterDisabled} onclick={later}>
        <span class="move-word">{t("slideshow.later")}</span><Icon name="chevronRight" />
      </button>
    {/if}
    {#if !selection.several || count === 1}
      {#if onView !== undefined}
        <button class="btn icon-btn" type="button" onclick={view}>
          <Icon name="eye" /><span class="view-word">{t("slideshow.view")}</span>
        </button>
      {/if}
      <button class="btn" type="button" onclick={edit}>
        <Icon name={viewMode ? "eye" : "pencil"} />
        <span>{t(viewMode ? "slideshow.view" : "slideshow.edit")}</span>
      </button>
      {#if onInsertChapter !== undefined}
        <button class="btn icon-btn" type="button" onclick={insertChapter}>
          <Icon name="chapter" /><span class="chapter-word">{t("chapters.insertChapter")}</span>
        </button>
      {/if}
    {/if}
    <!-- The last picture stays: Remove looks off but still answers, saying why. -->
    <button class="btn remove" type="button" aria-disabled={removeDisabledLook} onclick={remove}>
      <Icon name="trash" /><span>{t("slideshow.remove")}</span>
    </button>
    <button class="btn done" type="button" onclick={onDone}>{t("slideshow.done")}</button>
  </div>
</div>

<style>
  .dock {
    position: fixed;
    left: 50%;
    bottom: var(--selection-bar-inset);
    z-index: 10;
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: calc(100% - 24px);
    translate: -50% 0;
  }
  .bar {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--selection-bar-height);
    gap: 4px;
    padding: 6px;
    border-radius: var(--gl-radius-large);
    /* Inverse to the screen behind it, so the bar stands out in either theme. */
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
    box-shadow: var(--gl-shadow);
  }
  .bar .btn {
    height: 40px;
    padding: 0 12px;
    border-color: transparent;
    background: transparent;
    color: inherit;
  }
  .bar .remove :global(svg) {
    color: var(--gl-inverse-danger);
  }
  .bar .done {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .bar .done:hover {
    background: var(--gl-accent-hover);
  }
  /* A touch screen keeps the last tapped button "hovered": highlight for a mouse only. */
  @media (hover: hover) {
    .bar .btn:hover:not(:disabled, [aria-disabled="true"], .done) {
      background: var(--gl-inverse-hover);
    }
    .bar .remove:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-inverse-danger) 30%, var(--gl-inverse-bg));
    }
  }
  .count {
    padding: 0 8px 0 6px;
    color: var(--gl-inverse-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
  /* Selecting several (dev-docs/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several): the count in the accent. */
  .count.several {
    color: var(--gl-inverse-text);
    font-weight: var(--gl-weight-medium);
  }
  .count.several b {
    display: inline-grid;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    margin-right: 5px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-weight: var(--gl-weight-medium);
    place-items: center;
  }
  .separator {
    width: 1px;
    height: 24px;
    background: var(--gl-inverse-line);
  }
  @container (max-width: 720px) {
    .dock {
      left: 8px;
      right: 8px;
      max-width: none;
      justify-items: stretch;
      translate: none;
    }
    .bar {
      justify-content: space-between;
    }
    .bar {
      gap: 2px;
      padding: 4px;
    }
    .bar .btn {
      gap: 4px;
      padding: 0 6px;
      font-size: var(--gl-size-caption);
    }
    /* Icon alone, no label to pad for: Earlier, Later, View, Insert chapter. */
    .bar .icon-btn {
      padding: 0 4px;
    }
    /*
     * A single selection's count is for assistive technology only; several's stays visible.
     * Earlier, Later, View and Insert chapter show their icon alone, so every button fits a
     * phone's width with German labels.
     */
    .count:not(.several),
    .move-word,
    .view-word,
    .chapter-word {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .count.several {
      padding: 0 2px 0 4px;
    }
    .count.several .word {
      display: none;
    }
    .separator {
      display: none;
    }
  }
</style>
