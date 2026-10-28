<script lang="ts">
  import { orderWithGroupShifted } from "../../../library/group-order";
  import { browserScheduler, type Scheduler } from "../../../ui-kit/scheduler";
  import type { IconName } from "../../../ui-kit/icons";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";
  import AddingBarActions from "./AddingBarActions.svelte";
  import BarAction from "./BarAction.svelte";
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
    holdScheduler = browserScheduler,
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
    /**
     * The adding bar (IMPORT_ARRANGING.md): View (full-screen) instead of Edit, as words, for no
     * picture editor while importing. Otherwise every action is an icon with a label bubble.
     */
    viewMode?: boolean;
    /** Inserts a trip chapter before the selected picture (TRIP_CHAPTERS.md); omitted while importing. */
    onInsertChapter?: (pictureId: string) => void;
    /** Times the press and hold that shows an icon's bubble on a touch screen. */
    holdScheduler?: Scheduler;
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
  // Select mode with nothing picked yet: Remove names no count.
  const removeLabel = $derived(
    !selection.several
      ? t("slideshow.removePictures", { count: 1 })
      : count === 0
        ? t("slideshow.removeNoPictures")
        : t("slideshow.removePictures", { count }),
  );
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

{#snippet action(icon: IconName, label: string, onclick: () => void, disabledLook = false)}
  <BarAction {icon} {label} {disabledLook} {holdScheduler} {onclick} />
{/snippet}

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
    {#if viewMode}
      <AddingBarActions
        {arranging}
        single={!selection.several || count === 1}
        {earlierDisabled}
        {laterDisabled}
        {removeDisabledLook}
        onEarlier={earlier}
        onLater={later}
        onView={edit}
        onRemove={remove}
      />
    {:else}
      {#if arranging}
        {@render action("chevronLeft", t("slideshow.earlier"), earlier, earlierDisabled)}
        {@render action("chevronRight", t("slideshow.later"), later, laterDisabled)}
      {/if}
      {#if !selection.several || count === 1}
        {#if onView !== undefined}
          {@render action("eye", t("slideshow.viewFullScreen"), view)}
        {/if}
        {@render action("pencil", t("slideshow.editPicture"), edit)}
        {#if onInsertChapter !== undefined}
          {@render action("chapter", t("chapters.insertChapterBefore"), insertChapter)}
        {/if}
      {/if}
      <BarAction
        icon="trash"
        label={removeLabel}
        danger
        disabledLook={removeDisabledLook}
        {holdScheduler}
        onclick={remove}
      />
    {/if}
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
  .done {
    height: 40px;
    padding: 0 12px;
    border-color: transparent;
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .done:hover {
    background: var(--gl-accent-hover);
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
    .done {
      padding: 0 6px;
      font-size: var(--gl-size-caption);
    }
    /* A single selection's count is for assistive technology only; several's stays visible. */
    .count:not(.several) {
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
