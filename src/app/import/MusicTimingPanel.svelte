<script lang="ts">
  import type { PictureLength } from "../../library/picture-length";
  import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import SecondsStepper from "../components/SecondsStepper.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import type { ImportTiming } from "./import-view";
  import MusicFit from "./MusicFit.svelte";

  /**
   * Step 2's picture-length choice and the row "n pictures | x s per picture | m:ss total"
   * (app/IMPORT_WIZARD.md, Music): with a chosen song, the pictures against it to one scale;
   * without one, a stepper for the seconds per picture.
   */
  let {
    ownSeconds,
    secondsPerPicture,
    onPictureLength,
    onSecondsPerPicture,
    pictureIds,
    urls,
    segmentsMs,
    timing,
    songs,
    pictureCount,
  }: {
    ownSeconds: boolean;
    secondsPerPicture: number;
    /** `undefined`: the pictures fill the music. */
    onPictureLength: (length: PictureLength | undefined) => void;
    onSecondsPerPicture: (seconds: number) => void;
    pictureIds: readonly string[];
    /** Thumbnail URLs by picture id, as far as loaded. */
    urls: ReadonlyMap<string, string>;
    segmentsMs: readonly number[];
    timing: ImportTiming;
    /** In play order. */
    songs: readonly PlaylistSongView[];
    pictureCount: number;
  } = $props();

  const { t, formatDuration, formatSeconds } = getTranslator();
</script>

{#if timing.music !== null}
  <div class="panel">
    <PictureLengthSection
      {ownSeconds}
      {secondsPerPicture}
      {onPictureLength}
      {onSecondsPerPicture}
    />
    <MusicFit {pictureIds} {urls} {segmentsMs} {timing} music={timing.music} {songs} />
  </div>
{:else}
  <div class="panel track">
    <div class="text">
      <b>{t("import.secondsTitle")}</b>
      <span class="muted meta">
        {t("import.secondsHint", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
      </span>
    </div>
    <SecondsStepper seconds={secondsPerPicture} onChange={onSecondsPerPicture} />
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
  .track {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .text b {
    display: block;
    font-weight: var(--gl-weight-semibold);
  }
  .meta {
    font-size: var(--gl-size-meta);
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
