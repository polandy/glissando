<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PictureEditorView } from "./picture-editor-view";

  /** The picture editor's way to the previous and next picture, with where this one is. */
  let {
    picture,
    onOpen,
  }: {
    picture: PictureEditorView;
    onOpen: (pictureId: string) => void;
  } = $props();

  const { t } = getTranslator();

  function openNeighbour(pictureId: string | null): void {
    if (pictureId !== null) {
      onOpen(pictureId);
    }
  }
</script>

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
  @container (max-width: 720px) {
    .counter {
      display: none;
    }
  }
</style>
