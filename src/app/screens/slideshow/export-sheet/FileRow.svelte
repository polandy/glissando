<script lang="ts">
  /** A finished export's file: thumbnail, name and facts. */
  let { thumbnailUrl, name, facts }: { thumbnailUrl: string; name: string; facts: string } =
    $props();
</script>

<div class="file">
  <img class="thumb" alt="" src={thumbnailUrl} />
  <b>{name}</b>
  <small class="mono">{facts}</small>
</div>

<style>
  .file {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 2px 12px;
    padding: 12px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  .thumb {
    grid-row: span 2;
    width: 64px;
    aspect-ratio: 16 / 9;
    border-radius: var(--gl-radius-small);
    object-fit: cover;
  }
  b {
    overflow: hidden;
    font-weight: var(--gl-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
