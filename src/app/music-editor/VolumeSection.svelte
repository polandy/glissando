<script lang="ts">
  import { MUSIC_VOLUME_MAX_DB, MUSIC_VOLUME_MIN_DB } from "../../library/own-music";
  import Icon from "../components/Icon.svelte";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ListenState } from "./listen-preview";
  import type { VolumeView } from "./volume-view";

  /**
   * The selected song's own volume, atop the level that brings its excerpt to the target loudness
   * (ADR-0040, dev-docs/library/MUSIC.md "Loudness levelling and song volume"): a slider from
   * {@link MUSIC_VOLUME_MIN_DB} to {@link MUSIC_VOLUME_MAX_DB} with a tick where it is levelled,
   * the zone past the peak ceiling hatched and out of reach, and a button to listen to it.
   */
  let {
    volume,
    listening,
    onVolume,
    onReset,
    onListen,
    onToggleOriginal,
  }: {
    volume: VolumeView;
    /** The song's listen at volume, if under way; other kinds leave the buttons unpressed. */
    listening: ListenState | null;
    /** `undefined`: levelled. */
    onVolume: (volumeDb: number | undefined) => void;
    onReset: () => void;
    /** Starts or stops a listen at this volume, from the excerpt's loudest part. */
    onListen: () => void;
    /** While listening, swaps the resolved gain for the original file's (or back). */
    onToggleOriginal: () => void;
  } = $props();

  const { t, formatVolumeDb } = getTranslator();
  const playing = $derived(listening?.kind === "volume");
  const original = $derived(listening?.kind === "volume" && (listening.original ?? false));
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
    <b class="mono"
      >{volume.levelled ? t("music.volumeLevelled") : formatVolumeDb(volume.shownDb)}</b
    >
    <span class="sub">{t(subKeys[volume.sub.kind])}</span>
  </div>
  <div class="rail">
    <input
      type="range"
      min={MUSIC_VOLUME_MIN_DB}
      max={volume.capDb}
      step="1"
      value={volume.shownDb}
      style:flex-grow={volume.capDb - MUSIC_VOLUME_MIN_DB}
      aria-labelledby="music-volume"
      aria-valuetext={formatVolumeDb(volume.shownDb)}
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
  <div class="listen">
    <button class="listen-btn" type="button" aria-pressed={playing} onclick={onListen}>
      <span class="round"><Icon name={playing ? "pause" : "play"} /></span>
      <b>{playing ? t("music.volumeListenStop") : t("music.volumeListen")}</b>
      <small class="mono">
        {original ? t("music.volumeListenOriginal") : t("music.volumeListenAt")}
      </small>
    </button>
    <button
      class="orig-btn"
      type="button"
      aria-pressed={original}
      disabled={!playing}
      onclick={onToggleOriginal}
    >
      {t("music.volumeOriginalFile")}
    </button>
  </div>
  {#if playing}
    <p class="hint">{t("music.volumeListenCompare")}</p>
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
  .listen {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }
  .listen-btn {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 10px;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    text-align: left;
    cursor: pointer;
  }
  .listen-btn:hover {
    background: var(--gl-hover);
  }
  .listen-btn[aria-pressed="true"] {
    border-color: var(--gl-accent);
    box-shadow: 0 0 0 1px var(--gl-accent) inset;
  }
  .listen-btn b {
    font-weight: var(--gl-weight-semibold);
  }
  .listen-btn small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .round {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
  }
  .orig-btn {
    padding: 0 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    cursor: pointer;
  }
  .orig-btn:hover:not(:disabled) {
    background: var(--gl-hover);
  }
  .orig-btn[aria-pressed="true"] {
    border-color: var(--gl-accent);
    box-shadow: 0 0 0 1px var(--gl-accent) inset;
  }
  .orig-btn:disabled {
    color: var(--gl-muted);
    cursor: default;
  }
</style>
