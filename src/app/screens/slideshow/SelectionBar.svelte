<script lang="ts">
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";
  import AddingBarActions from "./AddingBarActions.svelte";
  import BarAction from "./BarAction.svelte";
  import MoveToSheet from "./MoveToSheet.svelte";
  import SelectionCount from "./SelectionCount.svelte";
  import SoleActions from "./SoleActions.svelte";
  import { barItem, chapterItem, moveToItem, type BarItem } from "./SelectionBarItem";
  import { selectionBarView } from "./selection-bar-view";
  import type { StripSelection } from "./strip-selection";

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
    onPlayFrom,
    onDone,
    arranging = true,
    viewMode = false,
    onInsertChapter,
    onMoveGroup,
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
    /** Plays the slideshow from the picture (PLAYER_OVERLAY.md); one picture selected, only. */
    onPlayFrom?: (pictureId: string) => void;
    onDone: () => void;
    /** False hides Earlier/Later and Move to… (IMPORT_ARRANGING.md, Add media): no moving while adding. */
    arranging?: boolean;
    /**
     * The adding bar (IMPORT_ARRANGING.md): View (full-screen) instead of Edit, as words, for no
     * picture editor while importing. Otherwise every action is labelled; a narrow screen shows
     * them all in a second row under the count and Done.
     */
    viewMode?: boolean;
    /** Inserts a trip chapter before the selected picture (TRIP_CHAPTERS.md); omitted while importing. */
    onInsertChapter?: (pictureId: string) => void;
    /** Moves the pictures to an insertion in the current order ("Move to…"); omitted hides it. */
    onMoveGroup?: (pictureIds: readonly string[], insertion: number) => void;
  } = $props();

  const { t } = getTranslator();
  const bar = $derived(
    selectionBarView(selection, order, {
      arranging,
      canInsertChapter: onInsertChapter !== undefined,
      canMoveGroup: onMoveGroup !== undefined,
    }),
  );
  const { selectedIds, count, soleId, soleIndex, single, range } = $derived(bar);
  const { earlierDisabled, laterDisabled, removeDisabledLook } = $derived(bar);
  const removeLabel = $derived(
    bar.removeLabel.key === "slideshow.removePictures"
      ? t(bar.removeLabel.key, { count: bar.removeLabel.count })
      : t(bar.removeLabel.key),
  );

  let moving = $state(false);

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

  const edit = (): void => void (soleId !== null && onEdit(soleId));
  const view = (): void => void (soleId !== null && onView?.(soleId));
  const playFrom = (): void => void (soleId !== null && onPlayFrom?.(soleId));
  const insertChapter = (): void => void (soleId !== null && onInsertChapter?.(soleId));
  const remove = (): void => void (count > 0 && onRemoveGroup(selectedIds));

  // The selection stays; the first moved tile is brought into view once the strip shows the new order.
  function move(insertion: number): void {
    moving = false;
    onMoveGroup?.(selectedIds, insertion);
  }

  const shifts = $derived<BarItem[]>(
    arranging
      ? [
          barItem("earlier", t("slideshow.earlier"), earlier, earlierDisabled),
          barItem("later", t("slideshow.later"), later, laterDisabled),
        ]
      : [],
  );
  const extras = $derived<BarItem[]>([
    ...(bar.showChapter ? [chapterItem(t, insertChapter)] : []),
    ...(bar.showMoveTo ? [moveToItem(t, () => (moving = true))] : []),
  ]);
</script>

{#snippet inline(items: readonly BarItem[])}
  {#each items as item (item.key)}
    <BarAction
      icon={item.icon}
      label={item.label}
      shortLabel={item.shortLabel}
      disabledLook={item.disabled}
      onclick={item.run}
    />
  {/each}
{/snippet}

<div class="dock" use:keepToastsClear>
  <div class="bar" class:labelled={!viewMode} role="toolbar" aria-label={t("slideshow.selection")}>
    <SelectionCount several={selection.several} {count} {range} total={order.length} {soleIndex} />
    <span class="separator" aria-hidden="true"></span>
    {#if viewMode}
      <AddingBarActions
        {arranging}
        {single}
        {earlierDisabled}
        {laterDisabled}
        {removeDisabledLook}
        onEarlier={earlier}
        onLater={later}
        onView={edit}
        onRemove={remove}
      />
    {:else}
      <!-- One row of actions: inline on a wide screen, the bar's second row on a narrow one. -->
      <div class="actions">
        {@render inline(shifts)}
        {#if single}
          <SoleActions
            onPlayFrom={onPlayFrom === undefined ? undefined : playFrom}
            onView={onView === undefined ? undefined : view}
            onEdit={edit}
          />
        {/if}
        {@render inline(extras)}
        <BarAction
          icon="trash"
          label={t("slideshow.remove")}
          name={removeLabel}
          danger
          disabledLook={removeDisabledLook}
          onclick={remove}
        />
      </div>
    {/if}
    <span class="spacer"></span>
    <button class="btn done" type="button" onclick={onDone}>{t("slideshow.done")}</button>
  </div>
  {#if moving}
    <MoveToSheet
      orderLength={order.length}
      startNumber={soleIndex + 1}
      onMove={move}
      onCancel={() => (moving = false)}
    />
  {/if}
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
  .spacer {
    flex: 1;
  }
  .actions {
    display: contents;
  }
  .done {
    height: 44px;
    padding: 0 14px;
    border-color: transparent;
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .done:hover {
    background: var(--gl-accent-hover);
  }
  .separator {
    width: 1px;
    height: 24px;
    background: var(--gl-inverse-line);
  }
  @container (width < 1140px) {
    .dock {
      left: 4px;
      right: 4px;
      max-width: none;
      justify-items: stretch;
      translate: none;
    }
    .bar {
      gap: 2px;
      padding: 2px;
    }
    /* Row 1: the count and Done; row 2: every action, equally wide, scrolling within the bar
       where a language's labels do not all fit. The adding bar keeps its one row of words. */
    .labelled {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto 1fr;
    }
    .labelled > :global(.count) {
      grid-row: 1;
      grid-column: 1;
    }
    .labelled .done {
      grid-row: 1;
      grid-column: 2;
    }
    .labelled .spacer {
      display: none;
    }
    .actions {
      display: flex;
      grid-row: 2;
      grid-column: 1 / -1;
      overflow-x: auto;
      overscroll-behavior-x: contain;
    }
    .actions :global(.action) {
      flex: 1 1 0;
      min-width: max(44px, min-content);
      padding: 0;
    }
    .separator {
      display: none;
    }
  }
</style>
