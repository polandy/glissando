<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { keepToastsClear } from "../components/toast-clearance";
  import { getTranslator } from "../i18n/context";
  import type { SetAsideReason, ViewerEntry } from "./picture-viewer-view";

  /** The viewer's bottom bar: a filmstrip of every picture, and the decision about the shown one. */
  let {
    entries,
    pictureId,
    urls,
    setAside,
    hidden,
    onShow,
    onRemove,
    onTakeIn,
  }: {
    entries: readonly ViewerEntry[];
    pictureId: string;
    /** Thumbnail URLs by picture id. */
    urls: ReadonlyMap<string, string>;
    /** Why the shown picture is not in the strip; null for one that is. */
    setAside: SetAsideReason | null;
    hidden: boolean;
    onShow: (pictureId: string) => void;
    onRemove: () => void;
    onTakeIn: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<footer class="bottom" class:hidden use:keepToastsClear>
  <ul class="film" aria-label={t("view.pictures")}>
    {#each entries as other, position (other.picture.id)}
      <li>
        <button
          type="button"
          aria-label={t("view.showPicture", { position: position + 1 })}
          aria-current={other.picture.id === pictureId}
          onclick={() => onShow(other.picture.id)}
        >
          {#if urls.has(other.picture.id)}<img src={urls.get(other.picture.id)} alt="" />{/if}
        </button>
      </li>
    {/each}
  </ul>
  {#if setAside === null}
    <button class="pill remove" type="button" onclick={onRemove}>
      <Icon name="trash" />{t("slideshow.remove")}
    </button>
  {:else}
    <button class="pill take" type="button" onclick={onTakeIn}>
      <Icon name="plus" />{t("view.takeIn")}
    </button>
  {/if}
</footer>

<style>
  .bottom {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 14px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
    transition: opacity 0.2s;
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }
  .film {
    display: flex;
    gap: 6px;
    max-width: 100%;
    margin: 0;
    padding: 2px;
    overflow-x: auto;
    list-style: none;
    scrollbar-width: none;
  }
  .film button {
    width: 56px;
    height: 42px;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: var(--gl-radius-small);
    background: var(--gl-player-glass);
    cursor: pointer;
    opacity: 0.6;
  }
  .film button[aria-current="true"] {
    border-color: var(--gl-player-progress);
    opacity: 1;
  }
  .film img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 18px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-player-glass);
    color: inherit;
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .take {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .pill:focus-visible,
  .film button:focus-visible {
    outline: 2px solid var(--gl-player-outline);
    outline-offset: 2px;
  }
</style>
