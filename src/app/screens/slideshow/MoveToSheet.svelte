<script lang="ts">
  import Dialog from "../../components/Dialog.svelte";
  import Icon from "../../components/Icon.svelte";
  import RadioGroup from "../../components/RadioGroup.svelte";
  import { getTranslator } from "../../i18n/context";
  import { insertionFor, stepPictureNumber, type MoveTarget } from "./move-target";

  /**
   * "Move to…" (REMOVE_SELECT_REORDER.md, Select and reorder): the selected pictures go to the
   * start, the end, or before a picture by its number, for when dragging is too far to reach.
   */
  let {
    orderLength,
    startNumber,
    onMove,
    onCancel,
  }: {
    orderLength: number;
    /** The number the "Before picture" stepper starts at: the selected picture's own. */
    startNumber: number;
    /** The insertion, counted in the order as it is now. */
    onMove: (insertion: number) => void;
    onCancel: () => void;
  } = $props();

  const { t } = getTranslator();
  let kind = $state<MoveTarget["kind"]>("start");
  // The sheet is mounted per opening, so the start is read once.
  // svelte-ignore state_referenced_locally
  let number = $state(startNumber);

  const target = $derived<MoveTarget>(kind === "before" ? { kind, number } : { kind });
</script>

<Dialog
  title={t("slideshow.moveTo")}
  message={[]}
  {onCancel}
  actions={[
    { label: t("common.cancel"), tone: "ghost", onSelect: onCancel },
    {
      label: t("slideshow.moveConfirm"),
      tone: "primary",
      onSelect: () => onMove(insertionFor(target, orderLength)),
    },
  ]}
>
  <RadioGroup
    label={t("slideshow.moveTo")}
    value={kind}
    onSelect={(chosen) => (kind = chosen)}
    options={[
      { value: "start", label: t("slideshow.moveStart") },
      { value: "end", label: t("slideshow.moveEnd") },
      { value: "before", label: t("slideshow.moveBefore") },
    ]}
  />
  {#if kind === "before"}
    <div class="stepper">
      <button
        class="btn"
        type="button"
        aria-label={t("slideshow.moveNumberLower")}
        disabled={number <= 1}
        onclick={() => (number = stepPictureNumber(number, -1, orderLength))}
      >
        <Icon name="minus" />
      </button>
      <b class="mono" aria-live="polite">{number}</b>
      <button
        class="btn"
        type="button"
        aria-label={t("slideshow.moveNumberHigher")}
        disabled={number >= orderLength}
        onclick={() => (number = stepPictureNumber(number, 1, orderLength))}
      >
        <Icon name="plus" />
      </button>
    </div>
  {/if}
</Dialog>

<style>
  .stepper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
  }
  .stepper .btn {
    width: 48px;
    height: 48px;
    padding: 0;
  }
  b {
    min-width: 48px;
    font-weight: var(--gl-weight-medium);
    text-align: center;
  }
</style>
