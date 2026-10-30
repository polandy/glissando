<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";
  import { moodPictureTimesRowText } from "./mood-picture-times-text";
  import type { MoodPictureLengthView } from "./music-editor-view";

  /**
   * The picture-length section while the slideshow's mood sets it, instead of the own-seconds
   * choice (MOOD.md): its text, and a button that leaves the mood for the single settings. While
   * `fittedShareMs` is set, the pictures instead shrink to end with a shorter music (ADR-0047).
   */
  let {
    moodPictureLength,
    fittedShareMs,
    onSetOwnPictureTimes,
  }: {
    moodPictureLength: MoodPictureLengthView;
    /** The mean shrunk share, while the automatic pictures fit a shorter music (ADR-0047). */
    fittedShareMs?: number | undefined;
    onSetOwnPictureTimes: () => void;
  } = $props();

  const translator = getTranslator();
  const { t, formatTenthSeconds } = translator;
  const HEAD_ID = "music-picture-length";
</script>

<section class="section" aria-labelledby={HEAD_ID}>
  <SectionHead id={HEAD_ID} icon="clock" title={t("music.pictureLength")} own={false} />
  <p class="by-mood">
    {moodPictureTimesRowText(translator, moodPictureLength.mood, moodPictureLength.beatsPerMinute)}
  </p>
  {#if fittedShareMs !== undefined}
    <p class="fitted">
      {t("music.pictureLengthFitted", {
        seconds: formatTenthSeconds(fittedShareMs / MILLISECONDS_PER_SECOND),
      })}
    </p>
  {/if}
  <button type="button" class="btn small ghost set-own" onclick={onSetOwnPictureTimes}>
    {t("music.setOwnPictureTimes")}
  </button>
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .by-mood {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .fitted {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .set-own {
    justify-self: start;
  }
</style>
