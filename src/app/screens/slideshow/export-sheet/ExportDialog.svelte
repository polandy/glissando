<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../../../components/Icon.svelte";
  import Separated from "../../../components/Separated.svelte";
  import Sheet from "../../../components/Sheet.svelte";

  /**
   * The export sheets' heading and ✕ in a `Sheet` (video_export/SHEET.md and html_export/SHEET.md). ✕ calls `onClose`; Esc goes back one
   * level through `onBack` when there is one, else it calls `onClose`.
   */
  let {
    labelId,
    title,
    subtitle,
    closeLabel,
    closeOnScrim,
    onClose,
    onBack,
    backLabel,
    children,
  }: {
    /** The heading's id, unique on the page. */
    labelId: string;
    title: string;
    subtitle: string | null;
    /** ✕'s name: "Abbrechen" while something runs, else "Schließen". */
    closeLabel: string;
    /** Whether a tap beside the sheet closes it: never where something would be lost. */
    closeOnScrim: boolean;
    onClose: () => void;
    /** Where the sheet was reached from a chooser: shows a Back control before the heading. */
    onBack?: (() => void) | undefined;
    /** Back's name; given with `onBack`. */
    backLabel?: string;
    children: Snippet;
  } = $props();
</script>

<Sheet {labelId} gap="roomy" {closeOnScrim} {onClose} onCancel={onBack}>
  <div class="parts">
    <header>
      {#if onBack !== undefined}
        <button
          class="icon-btn back"
          type="button"
          title={backLabel}
          aria-label={backLabel}
          onclick={onBack}
        >
          <Icon name="back" />
        </button>
      {/if}
      <div class="heading">
        <h2 id={labelId}>{title}</h2>
        {#if subtitle !== null}<p><Separated text={subtitle} /></p>{/if}
      </div>
      <button
        class="icon-btn"
        type="button"
        title={closeLabel}
        aria-label={closeLabel}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
    </header>
    {@render children()}
  </div>
</Sheet>

<style>
  /* The parts stay items of the sheet's grid. */
  .parts {
    display: contents;
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .heading {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-panel-title);
    letter-spacing: var(--gl-tracking-title);
    text-wrap: balance;
  }
  .heading p {
    margin: 4px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .icon-btn {
    margin: -6px -8px 0 0;
  }
  .icon-btn.back {
    margin: -6px 0 0 -8px;
  }
  /* Shared by the states' parts. */
  .parts :global(b) {
    font-weight: var(--gl-weight-semibold);
  }
  .parts :global(.hint) {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  .parts :global(footer) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  @media (max-width: 720px) {
    .parts :global(footer .btn) {
      flex: 1;
    }
  }
</style>
