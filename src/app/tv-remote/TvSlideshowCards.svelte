<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { TvSlideshowCard } from "./tv-session";

  /** The pick step's choice of the server's slideshows; the chosen one is pressed. */
  let {
    slideshows,
    selected,
    onSelect,
  }: {
    slideshows: readonly TvSlideshowCard[];
    selected: string | null;
    onSelect: (slideshowId: string) => void;
  } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<div class="cards">
  {#each slideshows as slideshow (slideshow.id)}
    <button
      class="card"
      type="button"
      aria-pressed={slideshow.id === selected}
      onclick={() => onSelect(slideshow.id)}
    >
      <b>{slideshow.title}</b>
      <small>
        {t("tvSheet.cardFacts", {
          pictures: t("units.pictures", { count: slideshow.pictureCount }),
          duration: formatDuration(slideshow.durationSeconds),
        })}
      </small>
    </button>
  {/each}
</div>

<style>
  .cards {
    display: grid;
    gap: 8px;
  }
  .card {
    display: grid;
    gap: 2px;
    width: 100%;
    padding: 12px 14px;
    border: 2px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .card:hover {
    background: var(--gl-hover);
  }
  .card[aria-pressed="true"] {
    border-color: var(--gl-accent);
    background: var(--gl-accent-tint);
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
