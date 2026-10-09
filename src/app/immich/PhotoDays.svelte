<script lang="ts">
  import type { ImmichPhoto } from "../../immich/immich-client";
  import type { PhotoDay } from "../../immich/photo-days";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { isWholeDaySelected } from "./immich-view";

  /**
   * Photos by day: a heading with Select day, then square tiles that toggle on a tap; a
   * shift-click hands over every photo shown, for a range from the last tapped one.
   */
  let {
    days,
    selectedIds,
    thumbnailUrl,
    onToggle,
    onSelectDay,
  }: {
    days: readonly PhotoDay[];
    selectedIds: ReadonlySet<string>;
    thumbnailUrl: (photoId: string) => string;
    onToggle: (photo: ImmichPhoto, shown: readonly ImmichPhoto[] | null) => void;
    /** `select` false deselects the day. */
    onSelectDay: (photos: readonly ImmichPhoto[], select: boolean) => void;
  } = $props();

  const { t, formatDay } = getTranslator();
  const isSelected = (photoId: string) => selectedIds.has(photoId);
  const shown = $derived(days.flatMap((day) => day.photos));
</script>

{#each days as day, index (`${day.day}-${index}`)}
  {@const whole = isWholeDaySelected(day.photos, isSelected)}
  <section class="day">
    <div class="day-head">
      <h2>{formatDay(day.day)}</h2>
      <span class="count mono">{day.photos.length}</span>
      <button class="btn ghost small" type="button" onclick={() => onSelectDay(day.photos, !whole)}>
        {whole ? t("immich.deselectDay") : t("immich.selectDay")}
      </button>
    </div>
    <ul class="grid" class:selecting={selectedIds.size > 0}>
      {#each day.photos as photo (photo.id)}
        {@const on = selectedIds.has(photo.id)}
        <li>
          <button
            class="ph"
            class:on
            type="button"
            aria-pressed={on}
            aria-label={photo.fileName}
            onclick={(event) => onToggle(photo, event.shiftKey ? shown : null)}
          >
            <img src={thumbnailUrl(photo.id)} alt="" loading="lazy" decoding="async" />
            <span class="check"><Icon name="check" /></span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<style>
  .day {
    display: grid;
    gap: 8px;
  }
  .day-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
  }
  .count {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .day-head .btn {
    margin-left: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    /* A shift-click picks a range of photos; it must not also select the text between. */
    user-select: none;
    -webkit-user-select: none;
  }
  .ph {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
    cursor: pointer;
    /* Keeps the check circle below the sticky bars. */
    isolation: isolate;
  }
  .ph img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.12s;
  }
  .ph.on {
    background: color-mix(in srgb, var(--gl-accent) 22%, var(--gl-surface));
  }
  .ph.on img {
    transform: scale(0.86);
    border-radius: var(--gl-radius-small);
  }
  .check {
    --gl-icon-size: var(--gl-size-icon-small);
    position: absolute;
    z-index: 1;
    top: 8px;
    left: 8px;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 2px solid var(--gl-on-photo);
    border-radius: 50%;
    background: var(--gl-photo-badge);
    color: transparent;
    opacity: 0;
  }
  .ph:hover .check,
  .ph:focus-visible .check,
  .selecting .check {
    opacity: 1;
  }
  .ph.on .check {
    opacity: 1;
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  @container (max-width: 720px) {
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ph img {
      transition: none;
    }
  }
</style>
