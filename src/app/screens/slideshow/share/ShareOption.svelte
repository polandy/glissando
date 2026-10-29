<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../../../components/Icon.svelte";
  import type { IconName } from "../../../../ui-kit/icons";

  /**
   * One row of the Share chooser: an icon tile, a title, a one-line text and a chevron. A row
   * that cannot be chosen is a dashed `div`; one that is only waiting is a button that stays
   * `aria-disabled`.
   */
  let {
    icon,
    title,
    text,
    onChoose,
    waiting = false,
    badge,
  }: {
    icon: IconName;
    title: string;
    text: string;
    /** Absent: the row only says why it is not available. */
    onChoose?: () => void;
    /** Chosen later: the button stays but does nothing. */
    waiting?: boolean;
    /** A state pill before the chevron, such as "On". */
    badge?: Snippet;
  } = $props();

  let button = $state<HTMLButtonElement>();

  export function focus(): void {
    button?.focus();
  }
</script>

{#if onChoose === undefined}
  <div class="option unavailable">
    <span class="tile"><Icon name={icon} /></span>
    <span class="text">
      <strong>{title}</strong>
      <small>{text}</small>
    </span>
  </div>
{:else}
  <button
    bind:this={button}
    class="option"
    type="button"
    aria-disabled={waiting}
    onclick={() => {
      if (!waiting) onChoose();
    }}
  >
    <span class="tile"><Icon name={icon} /></span>
    <span class="text">
      <strong>{title}</strong>
      <small>{text}</small>
    </span>
    <span class="go">
      {@render badge?.()}
      <Icon name="chevronRight" />
    </span>
  </button>
{/if}

<style>
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  button.option:hover {
    background: var(--gl-hover);
  }
  button.option[aria-disabled="true"] {
    color: var(--gl-muted);
    cursor: default;
  }
  button.option[aria-disabled="true"]:hover {
    background: var(--gl-surface);
  }
  .unavailable {
    border-style: dashed;
    background: transparent;
    color: var(--gl-faint);
    cursor: default;
  }
  .tile {
    display: grid;
    flex: none;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-raised);
    color: var(--gl-muted);
  }
  .text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  strong {
    font-weight: var(--gl-weight-semibold);
  }
  .unavailable strong {
    font-weight: var(--gl-weight-medium);
  }
  small {
    overflow: hidden;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .go {
    display: flex;
    flex: none;
    align-items: center;
    gap: 6px;
    color: var(--gl-muted);
  }
</style>
