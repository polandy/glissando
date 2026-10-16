<script lang="ts">
  import { untrack } from "svelte";
  import { MAX_VIDEO_VOLUME } from "../../library/own-video";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import ClipScrub from "./ClipScrub.svelte";

  /**
   * The clip's excerpt in a 16:9 screen, played in a loop with the sound at `volume` and a
   * slider to move within it. `peekMs` set pauses and shows that frame instead, leaving the
   * player's own place (the slider, the time badge, `onPosition`) exactly where it was, clamped
   * into the excerpt; `peekMs` back to null returns the clip itself to that place, resuming play
   * if it was playing there.
   */
  let {
    posterUrl,
    videoUrl,
    startMs,
    endMs,
    peekMs,
    volume,
    onPosition,
  }: {
    posterUrl: string | null;
    /** The clip's object URL; null while it loads. */
    videoUrl: string | null;
    startMs: number;
    endMs: number;
    /** The dragged handle's frame to show in place of the clip's own, while it stays; null otherwise. */
    peekMs: number | null;
    /** 0 to 100; 0 plays silently. */
    volume: number;
    /** The player's place in the whole clip, startMs to endMs. */
    onPosition: (clipMs: number) => void;
  } = $props();

  const MS_PER_SECOND = 1000;
  const { t, formatTenths } = getTranslator();

  let video: HTMLVideoElement | undefined = $state();
  let playing = $state(false);
  let clipMs = $state(untrack(() => startMs)); // the player's place in the whole clip
  let failed = $state(false);

  $effect(() => {
    if (video === undefined) return;
    video.volume = volume / MAX_VIDEO_VOLUME;
    video.muted = volume === 0;
  });
  const lengthMs = $derived(endMs - startMs);
  const positionMs = $derived(clipMs - startMs);
  const scrubValueMs = $derived(Math.min(Math.max(positionMs, 0), lengthMs));
  let deferredMs: number | null = null; // the place asked for while a seek was under way
  let beforePeek: { ms: number; wasPlaying: boolean } | null = $state(null); // null outside a peek
  /** Tells the parent the player's place, clamped to the excerpt it was asked to stay in. */
  function reportPosition(ms: number): void {
    onPosition(Math.min(Math.max(ms, startMs), endMs));
  }

  /** Moves only the video element's displayed frame, deferring to the latest ask if a seek is
      already under way; used while peeking so the player's own place is left untouched. */
  function seekVideoOnly(ms: number): void {
    if (video === undefined) return;
    if (video.seeking) {
      deferredMs = ms;
      return;
    }
    video.currentTime = ms / MS_PER_SECOND;
  }

  function seekTo(ms: number): void {
    clipMs = ms;
    reportPosition(ms);
    seekVideoOnly(ms);
  }

  // A drag asks for far more places than a clip can seek to; only the latest one is followed up.
  function settle(): void {
    if (video === undefined || video.seeking || deferredMs === null) return;
    const ms = deferredMs;
    deferredMs = null;
    video.currentTime = ms / MS_PER_SECOND;
  }

  // Where the clip belongs: peeking at a dragged handle (only the video's shown frame moves to
  // it; the player's own place stays remembered, reported clamped to the current excerpt so it
  // at most rides along a shrinking edge), settling back after a peek (clamped into the
  // now-current excerpt, resuming play if it was playing), or, with no peek, pulled inside an
  // excerpt a keyboard move just changed.
  $effect(() => {
    const peek = peekMs;
    const low = startMs;
    const high = endMs;
    untrack(() => {
      if (peek !== null) {
        beforePeek ??= { ms: clipMs, wasPlaying: playing };
        if (playing) video?.pause();
        seekVideoOnly(peek);
        reportPosition(clipMs);
        return;
      }
      if (beforePeek !== null) {
        const { ms, wasPlaying } = beforePeek;
        beforePeek = null;
        seekTo(Math.min(Math.max(ms, low), high));
        if (wasPlaying) video?.play().catch(() => (failed = true));
        return;
      }
      const clamped = Math.min(Math.max(clipMs, low), high);
      if (clamped === clipMs) reportPosition(clipMs);
      else seekTo(clamped);
    });
  });

  // The loop ends on the excerpt's end, which `timeupdate` is too coarse to catch.
  $effect(() => {
    const clip = video;
    if (!playing || clip === undefined) return;
    let frame = 0;
    const tick = (): void => {
      let ms = clip.currentTime * MS_PER_SECOND;
      if (ms >= endMs) {
        clip.currentTime = startMs / MS_PER_SECOND;
        ms = startMs;
      }
      clipMs = ms;
      reportPosition(ms);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  function toggle(): void {
    if (video === undefined) return;
    if (playing) {
      video.pause();
      return;
    }
    const at = video.currentTime * MS_PER_SECOND;
    if (at < startMs || at >= endMs) video.currentTime = startMs / MS_PER_SECOND;
    video.play().catch(() => (failed = true));
  }
</script>

<div class="preview">
  <div class="viewport">
    {#if videoUrl !== null}
      <!-- A clip is the user's own footage: there is no transcript to caption it with. -->
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        bind:this={video}
        src={videoUrl}
        poster={posterUrl ?? undefined}
        playsinline
        preload="auto"
        aria-label={t("clip.previewLabel")}
        onseeked={settle}
        onplay={() => (playing = true)}
        onpause={() => (playing = false)}
        onended={() => (playing = false)}
        onerror={() => (failed = true)}
      ></video>
    {:else if posterUrl !== null}
      <img src={posterUrl} alt="" />
    {/if}
    {#if failed}
      <p class="failed" role="alert">{t("clip.previewFailed")}</p>
    {:else}
      <button
        class="play"
        type="button"
        aria-label={playing ? t("clip.pause") : t("clip.play")}
        disabled={videoUrl === null}
        onclick={toggle}
      >
        <Icon name={playing ? "pause" : "play"} />
      </button>
    {/if}
    <span class="time mono" aria-hidden="true"
      >{formatTenths(Math.max(0, positionMs) / MS_PER_SECOND)}</span
    >
  </div>
  <ClipScrub
    valueMs={scrubValueMs}
    maxMs={lengthMs}
    disabled={videoUrl === null}
    onScrub={(relativeMs) => seekTo(startMs + relativeMs)}
  />
</div>

<style>
  .viewport {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-player-bg);
  }
  video,
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .play {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--gl-photo-play-ink);
    cursor: pointer;
    --gl-icon-size: var(--gl-size-icon-large);
  }
  .play > :global(svg) {
    box-sizing: content-box;
    padding: 14px;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    box-shadow: var(--gl-photo-play-shadow);
  }
  .play:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .time {
    position: absolute;
    z-index: 1;
    right: 8px;
    bottom: 8px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
  }
  .failed {
    position: absolute;
    inset: auto 12px 12px;
    z-index: 1;
    margin: 0;
    color: var(--gl-on-photo);
    font-size: var(--gl-size-meta);
    text-align: center;
  }
</style>
