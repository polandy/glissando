<script lang="ts">
  import { orderWithGroupShifted } from "../../../library/group-order";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";
  import AddingBarActions from "./AddingBarActions.svelte";
  import BarAction from "./BarAction.svelte";
  import MoveToSheet from "./MoveToSheet.svelte";
  import SelectionCount from "./SelectionCount.svelte";
  import SelectionBarMenu from "./SelectionBarMenu.svelte";
  import { barItem, type BarItem } from "./SelectionBarItem";
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
    onDone: () => void;
    /** False hides Earlier/Later and Move to… (IMPORT_ARRANGING.md, Add media): no moving while adding. */
    arranging?: boolean;
    /**
     * The adding bar (IMPORT_ARRANGING.md): View (full-screen) instead of Edit, as words, for no
     * picture editor while importing. Otherwise every action is labelled, with the moves in "More"
     * on a narrow screen.
     */
    viewMode?: boolean;
    /** Inserts a trip chapter before the selected picture (TRIP_CHAPTERS.md); omitted while importing. */
    onInsertChapter?: (pictureId: string) => void;
    /** Moves the pictures to an insertion in the current order ("Move to…"); omitted hides it. */
    onMoveGroup?: (pictureIds: readonly string[], insertion: number) => void;
  } = $props();

  const { t } = getTranslator();
  const selectedIds = $derived(selectedInOrder(selection, order));
  const count = $derived(selectedIds.length);
  const soleId = $derived(selectedIds[0] ?? null);
  const soleIndex = $derived(soleId === null ? -1 : order.indexOf(soleId));
  const single = $derived(!selection.several || count === 1);
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
  // Select mode with nothing picked yet: Remove names no count.
  const removeLabel = $derived(
    !selection.several
      ? t("slideshow.removePictures", { count: 1 })
      : count === 0
        ? t("slideshow.removeNoPictures")
        : t("slideshow.removePictures", { count }),
  );
  // Selecting several: disabled-looking with nothing selected. A single selection instead looks
  // disabled for the last picture, which stays; Remove still answers that, with its own toast.
  const removeDisabledLook = $derived(selection.several ? count === 0 : order.length < 2);

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
    ...(single && onInsertChapter !== undefined
      ? [barItem("chapter", t("chapters.insertChapterBefore"), insertChapter)]
      : []),
    ...(arranging && onMoveGroup !== undefined && count > 0
      ? [barItem("moveTo", t("slideshow.moveTo"), () => (moving = true))]
      : []),
  ]);
</script>

{#snippet inline(items: readonly BarItem[])}
  {#each items as item (item.key)}
    <BarAction
      icon={item.icon}
      label={item.label}
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
      <!-- A wide screen shows the moves inline; a narrow one keeps them in "More". -->
      <span class="wide-only">{@render inline(shifts)}</span>
      {#if single}
        {#if onView !== undefined}
          <BarAction
            icon="eye"
            label={t("slideshow.view")}
            name={t("slideshow.viewFullScreen")}
            onclick={view}
          />
        {/if}
        <BarAction
          icon="pencil"
          label={t("slideshow.edit")}
          name={t("slideshow.editPicture")}
          onclick={edit}
        />
      {/if}
      <span class="wide-only">{@render inline(extras)}</span>
      <BarAction
        icon="trash"
        label={t("slideshow.remove")}
        name={removeLabel}
        danger
        disabledLook={removeDisabledLook}
        onclick={remove}
      />
      {#if shifts.length + extras.length > 0}
        <span class="narrow-only"><SelectionBarMenu items={[...shifts, ...extras]} /></span>
      {/if}
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
  .narrow-only,
  .wide-only {
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
  /* The moves and extras sit inline only where they all fit; below that they are in "More". */
  @container (width < 1140px) {
    .wide-only {
      display: none;
    }
  }
  @container (width >= 1140px) {
    .narrow-only {
      display: none;
    }
  }
  @container (width < 1140px) {
    .dock {
      left: 8px;
      right: 8px;
      max-width: none;
      justify-items: stretch;
      translate: none;
    }
    .bar {
      gap: 2px;
      padding: 4px;
    }
    .separator {
      display: none;
    }
  }
</style>
