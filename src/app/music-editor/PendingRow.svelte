<script lang="ts">
  import Icon from "../components/Icon.svelte";

  /**
   * A song on its way into the playlist, or one that failed: reading, converting or downloading
   * (dashed, a pulsing dot) or unusable or failed (coral, a × that takes the row away).
   */
  let {
    title,
    status,
    progress,
    failed,
    removeLabel,
    onRemove,
  }: {
    title: string;
    /** The line under the title, where one applies. */
    status?: string;
    /** From 0 to 1; its presence alone shows the progress bar. */
    progress?: number;
    failed: boolean;
    removeLabel: string;
    onRemove: () => void;
  } = $props();
</script>

<li class="row" class:failed>
  <span class="name">
    <b>{title}</b>
    {#if status !== undefined}
      <small>{status}</small>
    {/if}
  </span>
  {#if failed}
    <button class="remove" type="button" aria-label={removeLabel} onclick={onRemove}>
      <Icon name="close" />
    </button>
  {:else}
    <span class="pulse" aria-hidden="true"></span>
  {/if}
  {#if progress !== undefined}
    <span class="progress" aria-hidden="true">
      <span class="bar" style:width={`${progress * 100}%`}></span>
    </span>
  {/if}
</li>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px;
    padding: 9px 6px 9px 14px;
    border: 1px dashed var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
  }
  .row.failed {
    border-color: var(--gl-coral);
    border-style: solid;
    background: color-mix(in srgb, var(--gl-coral) 8%, var(--gl-surface));
  }
  .name {
    display: grid;
    min-width: 0;
  }
  .name b {
    overflow: hidden;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .progress {
    display: block;
    grid-column: 1 / -1;
    height: 4px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-line);
  }
  .bar {
    display: block;
    height: 100%;
    background: var(--gl-accent);
  }
  .remove {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .remove:hover {
    background: var(--gl-hover);
    color: var(--gl-ink);
  }
  .pulse {
    width: 8px;
    height: 8px;
    margin: 0 12px;
    border-radius: 50%;
    background: var(--gl-accent);
  }
</style>
