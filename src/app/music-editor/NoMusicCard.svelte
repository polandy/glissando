<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import AddSongsButton from "./AddSongsButton.svelte";

  /** The music editor without songs: why to add one, and the one primary "Add a song" button. */
  let {
    onAdd,
    onOpenSheet,
  }: {
    onAdd: (files: readonly File[]) => void;
    /** With sample music on, the button opens the "Add a song" sheet instead of the file picker. */
    onOpenSheet?: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="empty">
  <span class="disc"><Icon name="music" /></span>
  <b>{t("music.noMusicYet")}</b>
  <p>{t("music.noMusicWhy")}</p>
  <AddSongsButton
    primary
    label={t("music.addSong")}
    {onAdd}
    {...onOpenSheet === undefined ? {} : { onOpenSheet }}
  />
</div>

<style>
  .empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 28px;
    border: 1px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    color: var(--gl-muted);
    text-align: center;
  }
  .empty b {
    color: var(--gl-ink);
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
  }
  .empty p {
    max-width: 44ch;
    margin: 0;
  }
  .disc {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--gl-accent) 30%, var(--gl-surface));
    color: var(--gl-ink);
  }
</style>
