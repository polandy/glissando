<script lang="ts">
  import { onMount } from "svelte";
  import { focusSlideshowSummary, type PicturesFocus } from "../../focus/pictures-focus";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowSearch } from "../../../library/focus-pass";
  import FocusSheetFooter from "./FocusSheetFooter.svelte";
  import FocusSheetGrid from "./FocusSheetGrid.svelte";
  import FocusSheetLegend from "./FocusSheetLegend.svelte";
  import FocusSheetStatus from "./FocusSheetStatus.svelte";
  import { focusSheetStatus, type FocusSheetFilter } from "./focus-sheet-view";

  /**
   * The Focus sheet: one slideshow's search summed up, filterable by result, and "Look again"
   * (ADR-0041, mockup "Variant A · grid"). A bottom sheet on phone, a right panel at desktop width.
   */
  let {
    focus,
    pictures,
    search,
    passPaused,
    onServer,
    onEdit,
    onLookAgain,
    onClose,
  }: {
    focus: PicturesFocus;
    pictures: readonly {
      readonly id: string;
      readonly thumbnailUrl: string;
      readonly ownMotion: boolean;
    }[];
    search: SlideshowSearch | undefined;
    passPaused: boolean;
    /** Where the result lives: `true` on the Glissando server, `false` on this device. */
    onServer: boolean;
    onEdit: (pictureId: string) => void;
    onLookAgain: (pictureIds: readonly string[]) => void;
    /** The ✕, the veil, or Esc. */
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  let filter = $state<FocusSheetFilter>(null);

  const summary = $derived(focusSlideshowSummary(focus, pictures, search, passPaused));
  const status = $derived(focusSheetStatus(summary, passPaused));
  const allPictureIds = $derived(pictures.map((picture) => picture.id));
  const failedPictureIds = $derived([...focus.failed]);

  let dialog: HTMLDialogElement;

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog) {
      onClose();
    }
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="focus-sheet-title"
  oncancel={cancel}
  onclick={closeOnScrim}
>
  <div class="sheet">
    <div class="grab"></div>
    <div class="shead">
      <h2 id="focus-sheet-title">{t("focusSheet.title")}</h2>
      <button
        class="ib"
        type="button"
        title={t("common.close")}
        aria-label={t("common.close")}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
    </div>
    <div class="sbody">
      <FocusSheetStatus {summary} {passPaused} />
      <FocusSheetLegend
        counts={summary.counts}
        ownMotionCount={summary.ownMotionCount}
        {filter}
        onFilter={(next) => (filter = next)}
      />
      <FocusSheetGrid {focus} {pictures} {passPaused} {filter} {onEdit} />
      <div class="where">
        <Icon name={onServer ? "server" : "device"} />
        {t(onServer ? "focusSheet.sharedOnServer" : "focusSheet.storedOnDevice")}
      </div>
    </div>
    <FocusSheetFooter
      {status}
      total={summary.total}
      ownMotionCount={summary.ownMotionCount}
      {failedPictureIds}
      {allPictureIds}
      {onLookAgain}
    />
  </div>
</dialog>

<style>
  dialog {
    position: fixed;
    inset: 0 0 0 auto;
    width: 440px;
    max-width: 100%;
    height: 100%;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-left: 1px solid var(--gl-line);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .grab {
    display: none;
  }
  .shead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px 4px;
  }
  .shead h2 {
    flex: 1;
    margin: 0;
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-panel-title);
  }
  .ib {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: var(--gl-radius);
    background: transparent;
    cursor: pointer;
  }
  .ib:hover {
    background: var(--gl-hover);
  }
  .sbody {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 16px 16px;
    overflow: auto;
  }
  .where {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      top: 70px;
      width: auto;
      height: auto;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .grab {
      display: block;
      width: 36px;
      height: 4px;
      margin: 8px auto 0;
      border-radius: var(--gl-radius-tiny);
      background: var(--gl-line);
    }
    .sbody {
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }
  }
</style>
