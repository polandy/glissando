<script lang="ts">
  import { orderWithGroupShifted } from "../../../library/group-order";
  import Icon from "../../components/Icon.svelte";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";
  import { isContiguous, selectedInOrder, type StripSelection } from "./strip-selection";

  /**
   * What the selection offers, fixed to the bottom of the viewport (dev-docs/APP.md, Select and
   * reorder; Selecting several). Its height and inset come from the screen, which keeps that
   * much room below its content.
   */
  let {
    selection,
    order,
    onShiftGroup,
    onRemoveGroup,
    onEdit,
    onDone,
  }: {
    selection: StripSelection;
    /** The slideshow's current play order, for the group moves and the contiguous range. */
    order: readonly string[];
    /** Earlier/Later: moves the selection by `offset` steps (ADR-0019). */
    onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
    onRemoveGroup: (pictureIds: readonly string[]) => void;
    /** Opens the picture editor; shown only while exactly one picture is selected. */
    onEdit: (pictureId: string) => void;
    onDone: () => void;
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

  function remove(): void {
    if (count > 0) {
      onRemoveGroup(selectedIds);
    }
  }
</script>

<div class="dock" use:keepToastsClear>
  <div class="bar" role="toolbar" aria-label={t("slideshow.selection")}>
    <!-- Announced on every move; on a narrow screen hidden from sight, not from screen readers. -->
    {#if selection.several}
      <span class="count mono several" aria-live="polite">
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
      <span class="count mono" aria-live="polite">
        {t("slideshow.selectionCount", { number: soleIndex + 1, total: order.length })}
      </span>
    {/if}
    <span class="separator" aria-hidden="true"></span>
    <!-- At the ends Earlier and Later look off but keep their place in the tab order. -->
    <button class="btn" type="button" aria-disabled={earlierDisabled} onclick={earlier}>
      <Icon name="chevronLeft" /><span>{t("slideshow.earlier")}</span>
    </button>
    <button class="btn" type="button" aria-disabled={laterDisabled} onclick={later}>
      <span>{t("slideshow.later")}</span><Icon name="chevronRight" />
    </button>
    {#if !selection.several || count === 1}
      <button class="btn" type="button" onclick={edit}>
        <Icon name="pencil" /><span>{t("slideshow.edit")}</span>
      </button>
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
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .bar .btn {
    height: 40px;
    padding: 0 12px;
    border-color: transparent;
    background: transparent;
  }
  .bar .done,
  .bar .done:hover {
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
  }
  /* A touch screen keeps the last tapped button "hovered": highlight for a mouse only. */
  @media (hover: hover) {
    .bar .btn:hover:not(:disabled, [aria-disabled="true"], .done) {
      background: var(--gl-hover);
    }
    .bar .remove:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-coral) 22%, var(--gl-surface));
    }
  }
  .count {
    padding: 0 8px 0 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
  /* Selecting several (dev-docs/APP.md, Selecting several): the count in the accent. */
  .count.several {
    color: var(--gl-ink);
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
    background: var(--gl-line);
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
    .bar .btn {
      gap: 5px;
      padding: 0 9px;
      font-size: var(--gl-size-label);
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
