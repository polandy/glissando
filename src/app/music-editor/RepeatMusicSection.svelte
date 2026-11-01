<script lang="ts">
  import Switch from "../components/Switch.svelte";
  import { getTranslator } from "../i18n/context";
  import InfoButton from "./InfoButton.svelte";

  /**
   * The slideshow's row, in the music editor's panel, for playing the playlist again while
   * pictures remain (ADR-0047): on while `StoredSlideshow`'s `repeatMusic` is set. Always
   * enabled: repeating is a choice even where the pictures would fit the music by themselves.
   * What it does sits behind the ⓘ button; the picture-length notice states the outcome.
   */
  let {
    on,
    onRepeatMusic,
  }: {
    on: boolean;
    /** `undefined`: the playlist plays once. */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<section class="row" aria-label={t("music.repeatMusic")}>
  <Switch
    checked={on}
    label={t("music.repeatMusic")}
    showLabel
    onChange={(checked) => onRepeatMusic(checked ? true : undefined)}
  />
  <InfoButton label={t("music.infoRepeatMusic")}>
    <p>{t("music.infoRepeatMusicText")}</p>
  </InfoButton>
</section>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
