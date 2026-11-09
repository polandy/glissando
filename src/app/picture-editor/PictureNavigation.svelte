<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PictureEditorView } from "./picture-editor-view";

  /**
   * The picture editor's header actions: play the slideshow from this picture, and the way to the
   * previous and next picture with where this one is.
   */
  let {
    picture,
    onOpen,
    onPlayFrom,
  }: {
    picture: PictureEditorView;
    onOpen: (pictureId: string) => void;
    /** Left out where playing from the picture does not apply (the clip editor). */
    onPlayFrom?: ((pictureId: string) => void) | undefined;
  } = $props();

  const { t } = getTranslator();

  function openNeighbour(pictureId: string | null): void {
    if (pictureId !== null) {
      onOpen(pictureId);
    }
  }
</script>

{#if onPlayFrom !== undefined}
  <button
    class="btn primary play"
    type="button"
    aria-label={t("slideshow.playFromHere")}
    title={t("slideshow.playFromHere")}
    onclick={() => onPlayFrom(picture.id)}
  >
    <Icon name="play" />
    <span class="play-label">{t("slideshow.playFromHere")}</span>
  </button>
{/if}
<button
  class="icon-btn"
  type="button"
  aria-label={t("editor.previous")}
  title={t("editor.previous")}
  aria-disabled={picture.previousId === null}
  onclick={() => openNeighbour(picture.previousId)}
>
  <Icon name="chevronLeft" />
</button>
<span class="counter mono muted">
  {t("editor.counter", { number: picture.number, count: picture.count })}
</span>
<button
  class="icon-btn"
  type="button"
  aria-label={t("editor.next")}
  title={t("editor.next")}
  aria-disabled={picture.nextId === null}
  onclick={() => openNeighbour(picture.nextId)}
>
  <Icon name="chevronRight" />
</button>

<style>
  .counter {
    font-size: var(--gl-size-meta);
  }
  .play {
    gap: 8px;
  }
  @container (max-width: 720px) {
    .counter,
    .play-label {
      display: none;
    }
    /* The label is gone: the button keeps its aria-label and a square target. */
    .play {
      width: 44px;
      padding: 0;
    }
  }
</style>
