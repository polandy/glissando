<script lang="ts">
  import { MAX_VIDEO_VOLUME } from "../../library/own-video";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The clip's excerpt in a 16:9 screen: its frame at `seekMs` while paused, played in a loop
   * between `startMs` and `endMs` with the sound at `volume`.
   */
  let {
    posterUrl,
    videoUrl,
    startMs,
    endMs,
    seekMs,
    volume,
  }: {
    posterUrl: string | null;
    /** The clip's object URL; null while it loads. */
    videoUrl: string | null;
    startMs: number;
    endMs: number;
    /** The frame shown while paused, e.g. the handle just moved. */
    seekMs: number;
    /** 0 to 100; 0 plays silently. */
    volume: number;
  } = $props();

  const MS_PER_SECOND = 1000;
  const { t, formatTenths } = getTranslator();

  let video: HTMLVideoElement | undefined = $state();
  let playing = $state(false);
  let positionMs = $state(0);
  let failed = $state(false);

  $effect(() => {
    if (video === undefined) return;
    video.volume = volume / MAX_VIDEO_VOLUME;
    video.muted = volume === 0;
  });

  function showFrame(): void {
    if (video !== undefined && !playing) video.currentTime = seekMs / MS_PER_SECOND;
  }
  $effect(() => {
    void seekMs;
    showFrame();
  });

  // The loop ends on the excerpt's end, which `timeupdate` is too coarse to catch.
  $effect(() => {
    const clip = video;
    if (!playing || clip === undefined) return;
    let frame = 0;
    const tick = (): void => {
      if (clip.currentTime * MS_PER_SECOND >= endMs) clip.currentTime = startMs / MS_PER_SECOND;
      positionMs = clip.currentTime * MS_PER_SECOND - startMs;
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
  <div class="screen">
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
        onloadedmetadata={showFrame}
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
</div>

<style>
  .screen {
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
