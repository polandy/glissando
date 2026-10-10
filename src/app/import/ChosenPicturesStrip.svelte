<script lang="ts">
  import { flushSync } from "svelte";
  import type { StoredPicture } from "../../library/stored-slideshow";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The pictures step's tiles: the stored pictures, each with its ✕, then a placeholder per file in flight. */
  let {
    pictures,
    urls,
    pending,
    onRemove,
    onEmptied,
  }: {
    pictures: readonly StoredPicture[];
    /** Thumbnail URLs by picture id; a tile without one shimmers. */
    urls: ReadonlyMap<string, string>;
    pending: number;
    onRemove: (pictureId: string) => void;
    /** The last picture was removed: the focus has no ✕ left to go to. */
    onEmptied: () => void;
  } = $props();

  const REMOVE_KEYS: ReadonlySet<string> = new Set(["Delete", "Backspace"]);
  const { t, formatDate } = getTranslator();
  let strip: HTMLUListElement | undefined = $state();

  /** Focus goes to the next picture's ✕, the previous one at the end. */
  function remove(index: number, pictureId: string): void {
    onRemove(pictureId);
    flushSync();
    const buttons = strip?.querySelectorAll<HTMLButtonElement>("button.remove") ?? [];
    const next = buttons[Math.min(index, buttons.length - 1)];
    if (next === undefined) {
      onEmptied();
    } else {
      next.focus();
    }
  }

  function removeOnKey(event: KeyboardEvent, index: number, pictureId: string): void {
    if (REMOVE_KEYS.has(event.key)) {
      event.preventDefault();
      remove(index, pictureId);
    }
  }
</script>

<ul class="strip" bind:this={strip}>
  {#each pictures as picture, index (picture.id)}
    <li class="tile" class:pending={!urls.has(picture.id)}>
      {#if urls.has(picture.id)}
        <img src={urls.get(picture.id)} alt="" />
      {/if}
      <span class="date mono">{formatDate(picture.capturedAt)}</span>
      <button
        class="remove"
        type="button"
        aria-label={t("import.removePicture", { date: formatDate(picture.capturedAt) })}
        title={t("slideshow.remove")}
        onclick={() => remove(index, picture.id)}
        onkeydown={(event) => removeOnKey(event, index, picture.id)}
      >
        <Icon name="close" />
      </button>
    </li>
  {/each}
  {#each { length: pending }, index (index)}
    <li class="tile pending"></li>
  {/each}
</ul>

<style>
  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .date {
    position: absolute;
    z-index: 1;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 7px 5px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
    color: var(--gl-on-photo);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
  }
  /* Always shown for touch, which has no other way to remove; a mouse sees it on hover. */
  .remove {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    backdrop-filter: blur(6px);
    cursor: pointer;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  /* A touch target of 44 px around the 26 px mark. */
  .remove::before {
    content: "";
    position: absolute;
    inset: -9px;
  }
  .remove:hover {
    background: var(--gl-coral);
    color: var(--gl-coral-ink);
  }
  @media (hover: hover) and (pointer: fine) {
    .remove {
      opacity: 0;
      transition: opacity 0.12s;
    }
    .tile:hover .remove,
    .remove:focus-visible {
      opacity: 1;
    }
  }
  .tile.pending {
    background: var(--gl-hover);
  }
  .tile.pending::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, var(--gl-scrim) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @container (max-width: 720px) {
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tile.pending::after {
      animation: none;
    }
  }
</style>
