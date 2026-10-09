<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** The slideshow's cover with its running time; a tap plays the slideshow. */
  let {
    coverUrl,
    durationSeconds,
    onPlay,
  }: { coverUrl: string; durationSeconds: number; onPlay: () => void } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<button class="preview" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
  <img src={coverUrl} alt="" />
  <span class="play"><Icon name="play" /></span>
  <span class="time mono">
    {t("player.time", {
      current: formatDuration(0),
      total: formatDuration(durationSeconds),
    })}
  </span>
</button>

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-large);
    background: var(--gl-hover);
    cursor: pointer;
  }
  .preview img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--gl-photo-vignette));
  }
  .play {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
    --gl-icon-size: var(--gl-size-icon-large);
  }
  /* The triangle's visual centre sits right of its box's centre. */
  .play :global(svg) {
    translate: 2px 0;
  }
  .time {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 1;
    padding: 3px 8px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-small);
    backdrop-filter: blur(6px);
  }
</style>
