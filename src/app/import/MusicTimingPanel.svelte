<script lang="ts">
  import type { SlideshowMood } from "../../library/slideshow-mood";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { moodName } from "../screens/slideshow/mood-text";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import type { ImportTiming } from "./music-fit";
  import MusicFit from "./MusicFit.svelte";

  /**
   * Step 2's pace line, the mood the new slideshow starts on, and the row "n pictures | x s per
   * picture | m:ss total" (import-wizard/MUSIC.md): with a chosen song, the pictures against it
   * to one scale.
   */
  let {
    mood,
    moodSeconds,
    pictureIds,
    urls,
    segmentsMs,
    timing,
    songs,
    pictureCount,
    onRepeatMusic,
    onAddSong,
  }: {
    mood: SlideshowMood;
    /** The mood's seconds per picture before the music's beats are known. */
    moodSeconds: number;
    pictureIds: readonly string[];
    /** Thumbnail URLs by picture id, as far as loaded. */
    urls: ReadonlyMap<string, string>;
    segmentsMs: readonly number[];
    timing: ImportTiming;
    /** In play order. */
    songs: readonly PlaylistSongView[];
    pictureCount: number;
    /** `undefined`: the music plays once through (ADR-0047). */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
    /** Opens the hidden file input to pick another song (ADR-0047). */
    onAddSong: () => void;
  } = $props();

  const { t, formatDuration, formatSeconds } = getTranslator();
</script>

<p class="pace">
  <Icon name="clock" />
  <span>
    <b>{t("import.paceMood", { mood: moodName(t, mood) })}</b> ·
    {t(timing.music === null ? "import.paceWithoutMusic" : "import.paceWithMusic", {
      seconds: formatSeconds(moodSeconds),
    })}
  </span>
</p>

{#if timing.music !== null}
  <div class="panel">
    <MusicFit
      {pictureIds}
      {urls}
      {segmentsMs}
      {timing}
      music={timing.music}
      {songs}
      {onRepeatMusic}
      {onAddSong}
    />
  </div>
{/if}

<dl class="timing">
  <div>
    <dt>{t("import.timingPictures")}</dt>
    <dd class="mono">{pictureCount}</dd>
  </div>
  <div>
    <dt>{t("import.timingPerPicture")}</dt>
    <dd class="mono">{formatSeconds(timing.perPictureSeconds)}</dd>
  </div>
  <div>
    <dt>{t("import.timingTotal")}</dt>
    <dd class="mono">{formatDuration(timing.totalSeconds)}</dd>
  </div>
</dl>

<style>
  .panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .pace {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .pace b {
    color: var(--gl-ink);
    font-weight: var(--gl-weight-semibold);
  }
  .timing {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
  }
  .timing div {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    padding: 10px 12px;
    background: var(--gl-raised);
  }
  .timing div + div {
    border-left: 1px solid var(--gl-line);
  }
  .timing dd {
    margin: 0;
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-name);
  }
  .timing dt {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
