<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { ImportTiming } from "./import-view";

  /**
   * The pictures against the chosen music, both to one scale: each picture's segment by the rule
   * the slideshow is composed with, the music under them, and how the two meet (ADR-0022).
   */
  let {
    pictureIds,
    urls,
    segmentsMs,
    timing,
    music,
    ownSeconds,
  }: {
    pictureIds: readonly string[];
    /** Thumbnail URLs by picture id, as far as loaded. */
    urls: ReadonlyMap<string, string>;
    segmentsMs: readonly number[];
    timing: ImportTiming;
    /** `timing.music`, which the step only shows the fit for. */
    music: NonNullable<ImportTiming["music"]>;
    /** The pictures last their own seconds, changing on the beat once it is known. */
    ownSeconds: boolean;
  } = $props();

  const { t, formatDuration, formatSeconds } = getTranslator();
  const PERCENT = 100;

  const spanSeconds = $derived(Math.max(timing.totalSeconds, music.seconds));
  const percentOf = (seconds: number) => `${(seconds / spanSeconds) * PERCENT}%`;
  // Within the music bar: where the slideshow ends and the music fades out.
  const endInMusic = $derived(`${(timing.totalSeconds / music.seconds) * PERCENT}%`);
</script>

<div class="fit" aria-hidden="true">
  <div class="segments" style:width={percentOf(timing.totalSeconds)}>
    {#each pictureIds as id, index (id)}
      {@const url = urls.get(id)}
      <i
        style:flex-grow={segmentsMs[index]}
        style:background-image={url === undefined ? undefined : `url("${url}")`}
      ></i>
    {/each}
  </div>
  <div class="music" style:width={percentOf(music.seconds)}>
    {#if music.kind === "fades-out"}<i class="after" style:left={endInMusic}></i>{/if}
  </div>
  <div class="fitline mono">
    <span>{formatDuration(0)}</span>
    <span>
      {t(ownSeconds ? "import.fitPerPictureAbout" : "import.fitPerPicture", {
        count: pictureIds.length,
        seconds: formatSeconds(timing.perPictureSeconds),
      })}
    </span>
    <span>{formatDuration(spanSeconds)}</span>
  </div>
</div>
<p class="note">
  {#if music.kind === "fades-out"}
    {t("import.fitFadesOut", { time: formatDuration(timing.totalSeconds) })}
  {:else if music.kind === "silent-after"}
    {t("import.fitSilentAfter", {
      over: formatDuration(timing.totalSeconds - music.seconds),
    })}
  {:else}
    {t("import.fitEndsWithMusic")}
  {/if}
</p>

<style>
  .fit {
    display: grid;
    gap: 6px;
  }
  .segments {
    display: flex;
    gap: 2px;
    height: 26px;
  }
  .segments i {
    flex-basis: 0;
    min-width: 0;
    border-radius: 3px;
    background-color: var(--gl-hover);
    background-position: center;
    background-size: cover;
  }
  /* The music to the same scale; washed out after the slideshow's end, where it has faded out. */
  .music {
    position: relative;
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--gl-accent);
  }
  .music .after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--gl-surface) 75%, transparent);
  }
  .fitline {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .note {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
