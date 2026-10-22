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

<DropZone icon="music" {onFiles} {onError}>
  <div class="own">
    <span class="own-title">{t("import.ownMusicTitle")}</span>
    <span class="own-hint">{t("import.musicFormats")}</span>
    <button class="btn" type="button" onclick={onChoose}>{t("import.chooseFiles")}</button>
  </div>
</DropZone>

<style>
  .own {
    display: grid;
    gap: 6px;
    justify-items: center;
    text-align: center;
  }
  .own-title {
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
    color: var(--gl-ink);
  }
  .own-hint {
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
</style>
