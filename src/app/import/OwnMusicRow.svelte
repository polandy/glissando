<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import DropZone from "./DropZone.svelte";

  /**
   * "Your own music" (SAMPLE_MUSIC.md, "Where it shows"): the file-format hint and "Choose
   * files", shared by the import step and the music editor's sheet; the row is also the drop zone.
   */
  let {
    onFiles,
    onError,
    onChoose,
  }: {
    onFiles: (files: File[]) => void;
    onError: (error: unknown) => void;
    onChoose: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<DropZone icon="music" compact {onFiles} {onError}>
  <div class="txt">
    <span class="own-title">{t("import.ownMusicTitle")}</span>
    <span class="own-hint">{t("import.musicFormats")}</span>
  </div>
  <button class="btn" type="button" onclick={onChoose}>{t("import.chooseFiles")}</button>
</DropZone>

<style>
  .txt {
    display: grid;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .own-title {
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
    color: var(--gl-ink);
  }
  .own-hint {
    overflow: hidden;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
