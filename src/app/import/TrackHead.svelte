<script lang="ts">
  import Icon from "../components/Icon.svelte";

  /** The music card's first row: icon, file name, a mono meta line, an optional note, ✕. */
  let {
    name,
    meta,
    note,
    closeLabel,
    onClose,
  }: {
    name: string;
    meta: string;
    note?: string | undefined;
    closeLabel: string;
    onClose: () => void;
  } = $props();
</script>

<div class="head">
  <span class="art"><Icon name="music" /></span>
  <div class="text">
    <b>{name}</b>
    <span class="muted mono meta">{meta}</span>
    {#if note}
      <span class="muted meta note">{note}</span>
    {/if}
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
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  b {
    display: block;
    overflow: hidden;
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: var(--gl-size-meta);
  }
  .note {
    display: block;
    margin-top: 3px;
  }
  .art {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius);
    background: linear-gradient(135deg, var(--gl-lemon), var(--gl-logo-peach));
    color: var(--gl-art-ink);
  }
</style>
