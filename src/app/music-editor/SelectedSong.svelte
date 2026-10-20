<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ListenState } from "./listen-preview";
  import type { MusicEditorView } from "./music-editor-view";
  import MusicWaveform from "./MusicWaveform.svelte";
  import SlideshowLane from "./SlideshowLane.svelte";
  import { percentOf } from "./waveform-scale";

  /**
   * The selected song, headed by its place and name: its excerpt on the waveform with the
   * pictures under it, and its start and end to listen to.
   */
  let {
    music,
    peaks,
    listening,
    onDraft,
    onCommit,
    onStopListening,
    onListen,
  }: {
    music: MusicEditorView;
    /** Fine peaks of the whole track, 0..1; null while the track is decoded. */
    peaks: Float32Array | null;
    listening: ListenState | null;
    /** The excerpt while a handle is dragged. */
    onDraft: (trim: MusicTrim) => void;
    /** The excerpt on release. */
    onCommit: (trim: MusicTrim) => void;
    onStopListening: () => void;
    onListen: (kind: "start" | "end") => void;
  } = $props();

  const { t, formatDuration, formatTenths } = getTranslator();
  const LISTENS = [
    { kind: "start", label: "music.listenStart", at: "music.listenFrom" },
    { kind: "end", label: "music.listenEnd", at: "music.listenUntil" },
  ] as const;
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
  const pct = (ms: number) => percentOf(ms, music.durationMs);
  /** Wide enough for the longest formatted time the chip shows, e.g. "12:34,5". */
  const CHIP_WIDTH_PX = 64;
</script>

<div class="head">
  <b class="song-heading">
    {t("music.songHeading", { number: music.songNumber, name: music.fileName })}
  </b>
  <span class="muted mono">
    {music.trimmed
      ? t("music.trimmedTo", {
          duration: formatDuration(seconds(music.durationMs)),
          excerpt: formatDuration(seconds(music.endMs - music.startMs)),
        })
      : formatDuration(seconds(music.durationMs))}
  </span>
</div>
<div class="wavebox">
  <div class="tracks">
    <MusicWaveform {music} {peaks} {onDraft} {onCommit} onGrab={onStopListening} />
    <SlideshowLane {music} listeningPositionMs={listening?.positionMs ?? null} />
    {#if listening !== null}
      <div class="playhead" style:left={pct(listening.positionMs)} aria-hidden="true"></div>
      <div
        class="chip mono"
        style:left="clamp(0px, calc({pct(listening.positionMs)} - {CHIP_WIDTH_PX / 2}px), calc(100%
        - {CHIP_WIDTH_PX}px))"
        style:width="{CHIP_WIDTH_PX}px"
        aria-hidden="true"
      >
        {formatTenths(seconds(listening.positionMs))}
      </div>
    {/if}
  </div>
</div>
<div class="listen">
  {#each LISTENS as listen (listen.kind)}
    {@const playing = listening?.kind === listen.kind}
    <button
      class="listen-btn"
      type="button"
      aria-pressed={playing}
      onclick={() => onListen(listen.kind)}
    >
      <span class="round"><Icon name={playing ? "pause" : "play"} /></span>
      <b>{t(listen.label)}</b>
      <small class="mono">
        {t(listen.at, {
          time: formatTenths(seconds(listen.kind === "start" ? music.startMs : music.audibleEndMs)),
        })}
      </small>
    </button>
  {/each}
</div>
<p class="hint">{t("music.hint")}</p>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    margin-top: 4px;
  }
  .song-heading {
    min-width: 0;
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
    overflow-wrap: anywhere;
  }
  .head span.muted {
    font-size: var(--gl-size-meta);
  }
  .wavebox {
    /* The bottom padding leaves room for the time chip below the slideshow lane, so nothing
       jumps when listening starts or stops. */
    padding: 42px 16px 40px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .tracks {
    position: relative;
    display: grid;
    gap: 8px;
  }
  /* One line, from the top of the waveform through the ruler to the bottom of the slideshow
     lane: the playhead at the same track-time scale both lanes use. */
  .playhead {
    position: absolute;
    top: -6px;
    bottom: -4px;
    z-index: 3;
    width: 2px;
    margin-left: -1px;
    background: var(--gl-ink);
    pointer-events: none;
  }
  .chip {
    position: absolute;
    top: calc(100% + 8px);
    z-index: 3;
    padding: 3px 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-ink);
    color: var(--gl-surface);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    text-align: center;
    pointer-events: none;
  }
  .listen {
    display: grid;
    grid-template-columns: 1fr 1fr;
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
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  @container (max-width: 720px) {
    .wavebox {
      padding: 40px 12px 38px;
    }
    .listen {
      gap: 8px;
    }
  }
</style>
