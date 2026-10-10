<script lang="ts">
  import { onDestroy } from "svelte";
  import { getTranslator } from "../i18n/context";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { PlacementPreview } from "./after-adding";
  import { reportUnlessMissingFromImmich } from "./missing-thumbnails";

  /** The play order after adding as small thumbnails, the new ones outlined, and their spots. */
  let {
    preview,
    loadThumbnail,
    onError,
  }: {
    preview: PlacementPreview;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
  } = $props();

  const { t } = getTranslator();

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({
    ...browserObjectUrls,
    load: loadThumbnail,
    onError: reportUnlessMissingFromImmich(onError),
  });
  onDestroy(() => thumbnails.dispose());
  let urls = $state.raw<ReadonlyMap<string, string>>(new Map());
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  $effect(() => thumbnails.sync(preview.order.map(({ id }) => id)));
</script>

<div class="placement">
  <ol class="order" aria-label={t("add.placementOrder")}>
    {#each preview.order as { id, isNew }, index (id)}
      <li class="mini" class:new={isNew}>
        {#if urls.has(id)}<img src={urls.get(id)} alt="" />{:else}<span class="pending"></span>{/if}
        <small class="mono">{index + 1}</small>
      </li>
    {/each}
  </ol>
  <ul class="spots">
    {#each preview.spots as { afterNumber, count } (afterNumber)}
      <li>
        {afterNumber === 0
          ? t("add.spotStart", { count })
          : t("add.spotAfter", { count, number: afterNumber })}
      </li>
    {/each}
  </ul>
</div>

<style>
  .placement {
    display: grid;
    gap: 8px;
  }
  .order {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mini {
    width: 40px;
    display: grid;
    gap: 2px;
    justify-items: center;
  }
  .mini img,
  .mini .pending {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: var(--gl-radius-small);
    display: block;
    opacity: 0.55;
    background: var(--gl-hover);
  }
  .mini.new img,
  .mini.new .pending {
    opacity: 1;
    outline: 2px solid var(--gl-accent);
    outline-offset: 1px;
  }
  .mini small {
    font-size: var(--gl-size-caption);
    color: var(--gl-faint);
  }
  .mini.new small {
    color: var(--gl-ink);
    font-weight: var(--gl-weight-medium);
  }
  .spots {
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--gl-size-small);
  }
  .spots li + li::before {
    content: "·";
    padding: 0 6px;
    color: var(--gl-muted);
  }
</style>
