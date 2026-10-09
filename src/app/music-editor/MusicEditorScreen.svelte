<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { setMusicTrim } from "../../library/slideshow-edits";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import FadeSection from "./FadeSection.svelte";
  import type { ListenKind, ListenState } from "./listen-preview";
  import { musicEditorView } from "./music-editor-view";
  import MusicWaveform from "./MusicWaveform.svelte";
  import SlideshowLane from "./SlideshowLane.svelte";
  import TimingNote from "./TimingNote.svelte";
  import TrimSection from "./TrimSection.svelte";

  /**
   * The music editor: the track's excerpt on its waveform, its fades and how the pictures meet
   * it. Every change goes to its callback and is stored at once.
   */
  let {
    slideshow,
    peaks,
    listening,
    onBack,
    onTrim,
    onFadeIn,
    onFadeOut,
    onListen,
    onStopListening,
    saving,
  }: {
    /** The slideshow, which has music. */
    slideshow: StoredSlideshow;
    /** Fine peaks of the whole track, 0..1; null while the track is decoded. */
    peaks: Float32Array | null;
    listening: ListenState | null;
    onBack: () => void;
    /** `undefined`: the whole track. */
    onTrim: (trim: MusicTrim | undefined) => void;
    /** `undefined`: automatic. */
    onFadeIn: (fadeMs: number | undefined) => void;
    onFadeOut: (fadeMs: number | undefined) => void;
    onListen: (kind: ListenKind) => void;
    onStopListening: () => void;
    /** An edit is being stored. */
    saving: boolean;
  } = $props();

  const { t, formatDuration, formatTenths } = getTranslator();
  const LISTENS = [
    { kind: "start", label: "music.listenStart", at: "music.listenFrom" },
    { kind: "end", label: "music.listenEnd", at: "music.listenUntil" },
  ] as const;

  /** The excerpt while a handle is dragged; stored on release. */
  let draft = $state.raw<MusicTrim | null>(null);
  const music = $derived(
    musicEditorView(draft === null ? slideshow : setMusicTrim(slideshow, draft)),
  );
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;

  function commit(trim: MusicTrim): void {
    draft = null;
    onTrim(trim);
  }
</script>

<div class="screen" aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title, t("music.crumb")]} {onBack} />
  <main class="edit">
    <div class="main-column">
      <div class="head">
        <span class="disc"><Icon name="music" /></span>
        <div>
          <b>{music.fileName}</b>
          <span class="muted mono">
            {music.trimmed
              ? t("music.trimmedTo", {
                  duration: formatDuration(seconds(music.durationMs)),
                  excerpt: formatDuration(seconds(music.endMs - music.startMs)),
                })
              : formatDuration(seconds(music.durationMs))}
          </span>
        </div>
      </div>
      <div class="wavebox">
        <MusicWaveform
          {music}
          {peaks}
          playheadMs={listening?.positionMs ?? null}
          onDraft={(trim) => (draft = trim)}
          onCommit={commit}
          onGrab={onStopListening}
        />
        <SlideshowLane {music} />
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
                time: formatTenths(
                  seconds(listen.kind === "start" ? music.startMs : music.audibleEndMs),
                ),
              })}
            </small>
          </button>
        {/each}
      </div>
      <p class="hint">{t("music.hint")}</p>
    </div>
    <div class="panel">
      <TrimSection {music} onTrim={commit} onReset={() => onTrim(undefined)} />
      <FadeSection
        direction="in"
        fade={music.fadeIn}
        audibleEndMs={music.audibleEndMs}
        onFade={onFadeIn}
        onReset={() => onFadeIn(undefined)}
      />
      <FadeSection
        direction="out"
        fade={music.fadeOut}
        audibleEndMs={music.audibleEndMs}
        onFade={onFadeOut}
        onReset={() => onFadeOut(undefined)}
      />
      <TimingNote note={music.note} />
    </div>
  </main>
</div>

<style>
  /* A zero basis: the screen keeps the viewport's height and each column scrolls inside it. */
  .edit {
    flex: 1 1 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: 0;
  }
  .main-column {
    display: grid;
    align-content: start;
    gap: 16px;
    min-height: 0;
    padding: 22px;
    overflow: auto;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head div {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .head b {
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
    overflow-wrap: anywhere;
  }
  .head span.muted {
    font-size: var(--gl-size-meta);
  }
  .disc {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-accent) 30%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .wavebox {
    display: grid;
    gap: 8px;
    padding: 42px 16px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
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
  .panel {
    display: grid;
    align-content: start;
    gap: 18px;
    min-height: 0;
    padding: 20px;
    overflow: auto;
    border-left: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .panel > :global(* + section) {
    padding-top: 18px;
    border-top: 1px solid var(--gl-line);
  }
  @container (max-width: 720px) {
    /* The phone layout scrolls as one: the waveform on top, the panel below. */
    .edit {
      flex: none;
      grid-template-columns: 1fr;
    }
    .main-column {
      padding: 16px;
      overflow: visible;
    }
    .wavebox {
      padding: 40px 12px 10px;
    }
    .listen {
      gap: 8px;
    }
    .panel {
      padding: 16px;
      overflow: visible;
      border-top: 1px solid var(--gl-line);
      border-left: 0;
    }
  }
</style>
