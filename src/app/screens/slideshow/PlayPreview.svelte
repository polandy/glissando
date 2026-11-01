<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /**
   * The slideshow's cover with a "Play · running time" pill; a tap anywhere plays it. `pulse`
   * runs the pill's one-shot attention ring, for the arrival right after creating the slideshow.
   */
  let {
    coverUrl,
    durationSeconds,
    onPlay,
    pulse = false,
  }: { coverUrl: string; durationSeconds: number; onPlay: () => void; pulse?: boolean } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<button class="preview" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
  <img src={coverUrl} alt="" />
  <span class="pill" class:pulse>
    <Icon name="play" />{t("slideshow.play")}
    <span class="mono">{` · ${formatDuration(durationSeconds)}`}</span>
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
  .pill {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-size: var(--gl-size-small);
    font-weight: 500;
  }
  .pill.pulse {
    animation: pulse 1s ease-out 1;
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--gl-accent) 90%, transparent);
      transform: scale(1);
    }
    40% {
      transform: scale(1.1);
    }
    100% {
      box-shadow: 0 0 0 22px color-mix(in srgb, var(--gl-accent) 0%, transparent);
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pill.pulse {
      animation: none;
    }
  }
</style>
