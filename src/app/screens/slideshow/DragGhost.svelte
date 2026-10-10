<script lang="ts">
  /** The dragged group's stack of thumbnails, following the pointer (ADR-0019). */
  let {
    groupIds,
    position,
    thumbnailUrl,
  }: {
    /** The dragged picture ids in play order, or null while not dragging. */
    groupIds: readonly string[] | null;
    position: { readonly x: number; readonly y: number } | null;
    thumbnailUrl: (pictureId: string) => string | undefined;
  } = $props();
</script>

{#if groupIds !== null && position !== null}
  <div class="ghost" style="left: {position.x - 48}px; top: {position.y - 60}px;">
    {#each groupIds.slice(0, 3) as pictureId, stackIndex (pictureId)}
      <img
        src={thumbnailUrl(pictureId)}
        alt=""
        style="left: {stackIndex * 6}px; top: {12 +
          stackIndex * 6}px; transform: rotate({(stackIndex - 1) * 4}deg);"
      />
    {/each}
    {#if groupIds.length > 1}
      <span class="count mono">{groupIds.length}</span>
    {/if}
  </div>
{/if}

<style>
  .ghost {
    position: fixed;
    z-index: 50;
    width: 120px;
    height: 100px;
    pointer-events: none;
    filter: drop-shadow(var(--gl-shadow));
  }
  .ghost img {
    position: absolute;
    width: 96px;
    height: 72px;
    object-fit: cover;
    border: 2px solid var(--gl-surface);
    border-radius: var(--gl-radius-tile);
  }
  .ghost .count {
    position: absolute;
    top: 0;
    right: 2px;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-size: var(--gl-size-caption);
    line-height: 26px;
    text-align: center;
  }
</style>
