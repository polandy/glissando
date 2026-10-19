<script lang="ts">
  import { MUSIC_VOLUME_MAX_DB, MUSIC_VOLUME_MIN_DB } from "../../library/own-music";
  import Icon from "../components/Icon.svelte";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";
  import type { VolumeView } from "./volume-view";

  /**
   * The selected song's own volume, atop the level that brings its excerpt to the target loudness
   * (ADR-0040, dev-docs/library/MUSIC.md "Loudness levelling and song volume"): a slider from
   * {@link MUSIC_VOLUME_MIN_DB} to {@link MUSIC_VOLUME_MAX_DB} with a tick where it is levelled,
   * the zone past the peak ceiling hatched and out of reach.
   */
  let {
    volume,
    onVolume,
    onReset,
  }: {
    volume: VolumeView;
    /** `undefined`: levelled. */
    onVolume: (volumeDb: number | undefined) => void;
    onReset: () => void;
  } = $props();

  const { t, formatVolumeDb } = getTranslator();
  const RANGE_DB = MUSIC_VOLUME_MAX_DB - MUSIC_VOLUME_MIN_DB;
  /** Where the "Levelled" tick sits along the full rail, 0 to 100. */
  const ZERO_PERCENT = ((0 - MUSIC_VOLUME_MIN_DB) / RANGE_DB) * 100;

  const subKeys = {
    unmeasured: "music.volumeSubUnmeasured",
    asFarAsItGoes: "music.volumeSubAsFarAsItGoes",
    sameLoudness: "music.volumeSubSameLoudness",
    louder: "music.volumeSubLouder",
    quieter: "music.volumeSubQuieter",
  } as const;

  function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
    const value = Number(event.currentTarget.value);
    onVolume(value === 0 ? undefined : value);
  }
</script>

<section class="section" aria-labelledby="music-volume">
  <SectionHead
    id="music-volume"
    icon="volume"
    title={t("music.volume")}
    stateText={volume.levelled ? t("music.volumeLevelled") : t("music.volumeOwn")}
    own={!volume.levelled}
  />
  <div class="readout">
    <b class="mono">{volume.levelled ? t("music.volumeLevelled") : formatVolumeDb(volume.ownDb)}</b>
    <span class="sub">{t(subKeys[volume.sub.kind])}</span>
  </div>
  <div class="rail">
    <input
      type="range"
      min={MUSIC_VOLUME_MIN_DB}
      max={volume.capDb}
      step="1"
      value={Math.min(volume.ownDb, volume.capDb)}
      style:flex-grow={volume.capDb - MUSIC_VOLUME_MIN_DB}
      aria-labelledby="music-volume"
      aria-valuetext={formatVolumeDb(volume.ownDb)}
      oninput={onInput}
    />
    {#if volume.capReached}
      <div
        class="cap"
        style:flex-grow={MUSIC_VOLUME_MAX_DB - volume.capDb}
        aria-hidden="true"
      ></div>
    {/if}
    <i class="zero" style:left="{ZERO_PERCENT}%" aria-hidden="true"></i>
  </div>
  {#if volume.hint.kind === "measuring"}
    <p class="hint">
      <span class="dot" aria-hidden="true"></span>{t("music.volumeHintMeasuring")}
    </p>
  {:else if volume.hint.kind === "undecodable"}
    <p class="hint">
      <span class="warn"><Icon name="alert" /></span>{t("music.volumeHintUndecodable")}
    </p>
  {:else if volume.hint.kind === "cappedShort"}
    <p class="hint">
      <span class="warn"><Icon name="alert" /></span>{t("music.volumeHintCappedShort", {
        shortDb: volume.hint.shortDb,
      })}
    </p>
  {:else if volume.hint.kind === "cappedMax"}
    <p class="hint">
      <span class="warn"><Icon name="alert" /></span>{t("music.volumeHintCappedMax")}
    </p>
  {:else if volume.hint.kind === "levelledBy"}
    <p class="hint">
      {t("music.volumeHintLevelledBy", {
        levelDb: formatVolumeDb(Math.round(volume.hint.levelDb)),
      })}
    </p>
  {/if}
  {#if !volume.levelled}
    <div>
      <ResetButton automatic={false} alreadyAutomatic="" label={t("music.volumeReset")} {onReset} />
    </div>
  {/if}
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .readout {
    display: grid;
    gap: 2px;
  }
  .readout b {
    font-size: var(--gl-size-name);
    font-weight: var(--gl-weight-semibold);
  }
  .readout .sub {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .rail {
    position: relative;
    display: flex;
    align-items: center;
    height: 28px;
  }
  .rail input[type="range"] {
    flex-shrink: 0;
    flex-basis: 0;
    width: auto;
    accent-color: var(--gl-accent);
  }
  .cap {
    flex-shrink: 0;
    flex-basis: 0;
    height: 6px;
    border-radius: var(--gl-radius-small);
    background-image: repeating-linear-gradient(45deg, var(--gl-faint) 0 3px, transparent 3px 6px);
  }
  .zero {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: 2px;
    margin-left: -1px;
    background: var(--gl-line);
    pointer-events: none;
  }
  .hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .hint .dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--gl-accent);
    animation: volume-hint-pulse 1s infinite;
  }
  @keyframes volume-hint-pulse {
    50% {
      opacity: 0.25;
    }
  }
  .hint .warn {
    display: flex;
    flex-shrink: 0;
    color: var(--gl-warn-icon);
    --gl-icon-size: var(--gl-size-icon-small);
  }
</style>
